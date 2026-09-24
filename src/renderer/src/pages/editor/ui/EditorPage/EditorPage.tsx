import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { SHORTCUT } from '@common/constants';
import { EASE_OUT } from '@/shared/lib';
import { isConfirmOpen } from '@/shared/ui/dialog';
import { ActivityBar } from '@/widgets/activity-bar';
import { AppCommandPalette, usePalette } from '@/widgets/command-palette';
import { EditorPanel } from '@/widgets/editor-panel';
import { Explorer } from '@/widgets/explorer';
import { PagePreview } from '@/widgets/page-preview';
import { SettingsPanel } from '@/widgets/settings-panel';
import { StatusBar } from '@/widgets/status-bar';
import { TitleBar } from '@/widgets/title-bar';
import { useLayout } from '../../model/layout';
import { focusAddressBar } from './focusAddressBar';
import { followRowWidth } from './followRowWidth';
import { PreviewPane } from './PreviewPane';
import { setAddressBar } from './setAddressBar';
import { shortcutKey } from './shortcutKey';
import { showSettings } from './showSettings';
import { SidebarPane } from './SidebarPane';

// Actions never change, so they are read once instead of subscribed to.
const { toggleSidebar, showSidebarView, sidebarExited, togglePreview } = useLayout.getState();
const { toggle: togglePalette } = usePalette.getState();

/** Global shortcuts, by lower-cased `KeyboardEvent.key` with Ctrl/Cmd (no Alt or Shift): the app menu's accelerators. */
const MOD_SHORTCUTS: Readonly<Record<string, () => void>> = {
  [shortcutKey(SHORTCUT.palette)]: togglePalette,
  [shortcutKey(SHORTCUT.quickOpen)]: togglePalette,
  [shortcutKey(SHORTCUT.sidebar)]: toggleSidebar,
};

/** Switching sidebar views, in seconds. */
const VIEW_SWAP_DURATION = 0.16;

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
      if (!mod || e.altKey || e.shiftKey || e.repeat || isConfirmOpen()) return;
      const key = e.key.toLowerCase();
      if (!Object.hasOwn(MOD_SHORTCUTS, key)) return;
      e.preventDefault();
      e.stopPropagation();
      MOD_SHORTCUTS[key]();
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
                  transition={{ duration: VIEW_SWAP_DURATION, ease: EASE_OUT }}
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
