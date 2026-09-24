import { isConfirmOpen } from '@/shared/ui/dialog';
import { usePalette } from '@/widgets/command-palette';
import { useLayout } from '../../model/layout';
import { focusAddressBar } from './focusAddressBar';

// Actions never change, so they are read once instead of subscribed to.
const { toggleSidebar } = useLayout.getState();
const { toggle: togglePalette } = usePalette.getState();

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
