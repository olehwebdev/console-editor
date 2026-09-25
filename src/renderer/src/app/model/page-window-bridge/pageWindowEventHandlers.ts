import type { MenuCommand } from '@common/types';
import { usePageStore } from '@/entities/page';
import { focusAddressBar } from '@/pages/page-window';
import type { PageWindowEventHandlers } from './types';

/** The menu commands the website window runs (the main process sends it only these). */
const PAGE_WINDOW_COMMANDS: Partial<Record<MenuCommand, () => void>> = { 'focus-url': focusAddressBar };

/** What each event does in the website window. */
export const PAGE_WINDOW_EVENT_HANDLERS: PageWindowEventHandlers = {
  'page-state': (event) => usePageStore.getState().setPage(event.state),
  command: (event) => PAGE_WINDOW_COMMANDS[event.command]?.(),
};
