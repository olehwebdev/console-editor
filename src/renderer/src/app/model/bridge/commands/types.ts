import type { MenuCommand } from '@common/types';
import type { EDIT_COMMAND_TARGETS, PAGE_COMMAND_METHODS } from './constants';

/** One handler per menu command, given that command: a new MenuCommand fails typecheck until it has one. */
export type MenuCommandHandlers = { [C in MenuCommand]: (command: C) => void };

export type EditMenuCommand = keyof typeof EDIT_COMMAND_TARGETS;

export type PageMenuCommand = keyof typeof PAGE_COMMAND_METHODS;
