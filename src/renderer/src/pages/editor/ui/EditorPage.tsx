import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';
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
import { useLayout } from '../model/layout';

export interface EditorPageProps {
  /** Receives the address bar input so the app menu's "Focus Address Bar" can reach it. */
  addressBarRef?: (el: HTMLInputElement | null) => void;
}

/** The workspace: title bar, activity rail, sidebar, editor, website preview, status bar. */
export function EditorPage({ addressBarRef }: EditorPageProps) {
  const layout = useLayout();
  const togglePalette = usePalette((s) => s.toggle);
  const address = useRef<HTMLInputElement | null>(null);
  const main = useRef<HTMLDivElement>(null);

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
        useLayout.getState().toggleSidebar();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [togglePalette]);

  const focusAddressBar = useCallback(() => {
    if (!useLayout.getState().previewVisible) useLayout.getState().togglePreview();
    requestAnimationFrame(() => {
      address.current?.focus();
      address.current?.select();
    });
  }, []);

  const previewWidth = `${Math.round(layout.previewRatio * 1000) / 10}%`;

  return (
    <div className="flex h-full flex-col bg-canvas text-fg">
      <TitleBar
        onOpenPalette={togglePalette}
        sidebarVisible={!!layout.sidebar}
        previewVisible={layout.previewVisible}
        onToggleSidebar={layout.toggleSidebar}
        onTogglePreview={layout.togglePreview}
      />
      <div ref={main} className="flex min-h-0 flex-1">
        <ActivityBar view={layout.sidebar} onViewChange={layout.showSidebarView} onOpenPalette={togglePalette} />

        <AnimatePresence initial={false}>
          {layout.sidebar ? (
            <motion.aside
              key="sidebar"
              className="relative shrink-0 overflow-hidden border-r border-line bg-surface"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: layout.sidebarWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={layout.resizing ? { duration: 0 } : SPRING_LAYOUT}
            >
              <div style={{ width: layout.sidebarWidth }} className="h-full">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={layout.sidebar}
                    className="h-full"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.16, ease: EASE_OUT }}
                  >
                    {layout.sidebar === 'settings' ? <SettingsPanel /> : <Explorer />}
                  </motion.div>
                </AnimatePresence>
              </div>
              <PanelResizer
                className="absolute inset-y-0 -right-1"
                aria-label="Resize sidebar"
                onResize={(delta) => layout.setSidebarWidth(useLayout.getState().sidebarWidth + delta)}
                onResizeStart={() => layout.setResizing(true)}
                onResizeEnd={() => layout.setResizing(false)}
              />
            </motion.aside>
          ) : null}
        </AnimatePresence>

        <main className="min-w-0 flex-1">
          <EditorPanel />
        </main>

        {layout.previewVisible ? (
          <>
            <PanelResizer
              aria-label="Resize website preview"
              onResize={(delta) => {
                const width = main.current?.clientWidth ?? window.innerWidth;
                layout.setPreviewRatio(useLayout.getState().previewRatio - delta / width);
              }}
              onResizeStart={() => layout.setResizing(true)}
              onResizeEnd={() => layout.setResizing(false)}
            />
            <div className="min-w-0 shrink-0 border-l border-line" style={{ width: previewWidth }}>
              <PagePreview
                suspended={layout.resizing}
                addressBarRef={(el) => {
                  address.current = el;
                  addressBarRef?.(el);
                }}
              />
            </div>
          </>
        ) : null}
      </div>
      <StatusBar />
      <AppCommandPalette onShowSettings={() => layout.setSidebar('settings')} onFocusAddressBar={focusAddressBar} />
    </div>
  );
}
