import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useLayoutEffect, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { EASE_OUT, SPRING_LAYOUT } from '@/shared/lib';
import { isConfirmOpen } from '@/shared/ui/dialog';
import { PanelResizer } from '@/shared/ui/panel-resizer';
import { ActivityBar } from '@/widgets/activity-bar';
import { AppCommandPalette, usePalette } from '@/widgets/command-palette';
import { EditorPanel } from '@/widgets/editor-panel';
import { Explorer } from '@/widgets/explorer';
import { PagePreview } from '@/widgets/page-preview';
import { SettingsPanel } from '@/widgets/settings-panel';
import { StatusBar } from '@/widgets/status-bar';
import { TitleBar } from '@/widgets/title-bar';
import { selectPreviewWidth, selectSettledPreviewWidth, selectSidebarWidth, useLayout } from '../model/layout';

// Actions never change, so they are read once instead of subscribed to.
const { setSidebar, toggleSidebar, showSidebarView, sidebarExited, togglePreview, resizeSidebar, resizePreview, setResizing, setRowWidth } = useLayout.getState();
const { toggle: togglePalette } = usePalette.getState();
const startResize = () => setResizing(true);
const endResize = () => setResizing(false);
const showSettings = () => setSidebar('settings');

/** The preview's address bar, while it is shown (there is one page). */
let addressBar: HTMLInputElement | null = null;
const setAddressBar = (el: HTMLInputElement | null) => {
  addressBar = el;
};

function focusAddressBar(): void {
  if (!useLayout.getState().previewVisible) togglePreview();
  // A preview shown just now has its address bar by the next frame.
  requestAnimationFrame(() => {
    addressBar?.focus();
    addressBar?.select();
  });
}

/** Ref callback: panels are fitted to the row, so the layout follows its width for as long as it exists. */
function followRowWidth(row: HTMLDivElement) {
  const measure = () => setRowWidth(row.clientWidth);
  measure();
  const observer = new ResizeObserver(measure);
  observer.observe(row);
  return () => observer.disconnect();
}

/** What the app menu can ask of the page (menu shortcuts also work while the website has focus). */
export interface PageCommands {
  focusAddressBar(): void;
  togglePalette(): void;
  toggleSidebar(): void;
}

export const pageCommands: PageCommands = {
  focusAddressBar,
  // Nothing acts underneath a confirm dialog.
  togglePalette: () => {
    if (!isConfirmOpen()) togglePalette();
  },
  toggleSidebar: () => {
    if (!isConfirmOpen()) toggleSidebar();
  },
};

/** The workspace: title bar, activity rail, sidebar, editor, website preview, status bar. */
export function EditorPage() {
  // Widths change on every drag frame; only the panes below subscribe to them.
  const { sidebar, previewVisible, resizing } = useLayout(
    useShallow((s) => ({ sidebar: s.sidebar, previewVisible: s.previewVisible, resizing: s.resizing })),
  );

  // Global shortcuts. Capture phase so Monaco doesn't swallow them.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      // A held key would flicker the palette; nothing acts underneath a confirm dialog.
      if (!mod || e.altKey || e.repeat || isConfirmOpen()) return;
      const key = e.key.toLowerCase();
      if ((key === 'k' || key === 'p') && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        togglePalette();
      } else if (key === 'b' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  return (
    <div className="flex h-full flex-col bg-canvas text-fg">
      <TitleBar
        onOpenPalette={togglePalette}
        sidebarVisible={!!sidebar}
        previewVisible={previewVisible}
        onToggleSidebar={toggleSidebar}
        onTogglePreview={togglePreview}
      />
      <div ref={followRowWidth} className="flex min-h-0 flex-1">
        <ActivityBar view={sidebar} onViewChange={showSidebarView} onOpenPalette={togglePalette} />

        {/* Until the sidebar has animated out, the preview doesn't grow into its room (the row would overflow). */}
        <AnimatePresence initial={false} onExitComplete={sidebarExited}>
          {sidebar ? (
            <SidebarPane key="sidebar" resizing={resizing}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={sidebar}
                  className="h-full"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.16, ease: EASE_OUT }}
                >
                  {sidebar === 'settings' ? <SettingsPanel /> : <Explorer />}
                </motion.div>
              </AnimatePresence>
            </SidebarPane>
          ) : null}
        </AnimatePresence>

        <main className="min-w-0 flex-1">
          <EditorPanel />
        </main>

        {previewVisible ? (
          <PreviewPane>
            {/* The sidebar animating in or out can move the preview without resizing it. */}
            <PagePreview suspended={resizing} layoutKey={!!sidebar} addressBarRef={setAddressBar} />
          </PreviewPane>
        ) : null}
      </div>
      <StatusBar />
      <AppCommandPalette onShowSettings={showSettings} onFocusAddressBar={focusAddressBar} />
    </div>
  );
}

/** The sidebar at its fitted width. Only this re-renders while it is dragged; `children` are passed through. */
function SidebarPane({ resizing, children }: { resizing: boolean; children: ReactNode }) {
  const width = useLayout(selectSidebarWidth);
  return (
    <motion.aside
      className="relative shrink-0 overflow-hidden border-r border-line bg-surface"
      initial={{ width: 0, opacity: 0 }}
      animate={{ width, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={resizing ? { duration: 0 } : SPRING_LAYOUT}
    >
      <div style={{ width }} className="h-full">
        {children}
      </div>
      <PanelResizer
        className="absolute inset-y-0 -right-1"
        aria-label="Resize sidebar"
        onResize={resizeSidebar}
        onResizeStart={startResize}
        onResizeEnd={endResize}
      />
    </motion.aside>
  );
}

/**
 * The preview at its fitted width. The width is also published as
 * `--preview-w`, so floating UI anchored to the window (the toast stack) can
 * stay off the native page view.
 */
function PreviewPane({ children }: { children: ReactNode }) {
  const width = useLayout(selectPreviewWidth);
  // Held while a panel is dragged: a root custom property restyles the whole document, and the view is hidden meanwhile anyway.
  const published = useLayout(selectSettledPreviewWidth);
  useLayoutEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--preview-w', `${published}px`);
    return () => {
      root.removeProperty('--preview-w');
    };
  }, [published]);
  return (
    <>
      <PanelResizer aria-label="Resize website preview" onResize={resizePreview} onResizeStart={startResize} onResizeEnd={endResize} />
      <div className="min-w-0 shrink-0 border-l border-line" style={{ width }}>
        {children}
      </div>
    </>
  );
}
