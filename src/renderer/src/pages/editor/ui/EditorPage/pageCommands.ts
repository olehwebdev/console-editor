import { isConfirmOpen } from '@/shared/ui/dialog';
import { usePalette } from '@/widgets/command-palette';
import { useLayout } from '../../model/layout';
import { usePanelTab } from '../../model/panel-tab';
import { INSPECT_VIEW } from './constants';
import { focusAddressBar } from './focusAddressBar';

// Actions never change, so they are read once instead of subscribed to.
const { toggleSidebar, toggleConsole, togglePreview, setSidebar } = useLayout.getState();
const { toggle: togglePalette } = usePalette.getState();

/** What the app menu can ask of the page (menu shortcuts also work while the website has focus). */
export interface PageCommands {
  focusAddressBar(): void;
  togglePalette(): void;
  toggleSidebar(): void;
  toggleConsole(): void;
  /** Shows the website preview (the website is back from its own window). */
  showPreview(): void;
  /** Shows the Inspect view, where what is under the pointer shows while picking. */
  showInspect(): void;
  /** Shows the Renders log under the editor. */
  showRenders(): void;
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
  toggleConsole: () => {
    if (!isConfirmOpen()) toggleConsole();
  },
  showPreview: () => {
    if (!useLayout.getState().previewVisible) togglePreview();
  },
  showInspect: () => {
    if (useLayout.getState().sidebar !== INSPECT_VIEW) setSidebar(INSPECT_VIEW);
  },
  showRenders: () => {
    usePanelTab.getState().show('renders');
    if (!useLayout.getState().consoleVisible) toggleConsole();
  },
};
