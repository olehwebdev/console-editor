import type { MenuCommand } from '@common/types';
import type { PageKind } from '@/entities/editor-tab';
import type { EDIT_COMMAND_TARGETS, PAGE_COMMAND_METHODS } from './constants';

/** One handler per menu command, given that command: a new MenuCommand fails typecheck until it has one. */
export type MenuCommandHandlers = { [C in MenuCommand]: (command: C) => void };

export type EditMenuCommand = keyof typeof EDIT_COMMAND_TARGETS;

export type PageMenuCommand = keyof typeof PAGE_COMMAND_METHODS;

/** What Save does for the tab in front: a file tab, or each kind of page (given its id). A new page kind fails typecheck until it has one. */
export type ActiveSavers = Record<'file' | PageKind, (id: string) => void>;
