import { PAGE_COMMAND_METHODS } from './constants';
import { pageCommands } from './pageCommands';
import type { PageMenuCommand } from './types';

/** Asks the page to run the command; does nothing before `startBridge` has its commands. */
export function runPageCommand(command: PageMenuCommand): void {
  pageCommands.current?.[PAGE_COMMAND_METHODS[command]]();
}
