import type { MenuCommand } from '../../shared/types';

/** The Edit menu's commands that native fields also understand. */
export type EditCommand = Extract<MenuCommand, 'undo' | 'redo' | 'select-all'>;
