import type { MenuCommand } from '@common/types';
import { MENU_COMMAND_HANDLERS } from './menuCommandHandlers';

/** Runs an app menu command. Generic so each command reaches its own handler without a cast. */
export function runCommand<C extends MenuCommand>(command: C): void {
  // A command this build doesn't know (main and renderer out of step, e.g. mid dev reload) is ignored, not thrown on.
  if (!Object.hasOwn(MENU_COMMAND_HANDLERS, command)) return;
  MENU_COMMAND_HANDLERS[command](command);
}
