import type { MenuCommand } from '@common/types';
import type { PageCommands } from '@/pages/editor';

/**
 * An edit command has a name in three places that only partly agree: the
 * menu, Monaco's handler ids, and `document.execCommand` (native fields).
 */
export const EDIT_COMMAND_TARGETS = {
  undo: { editorHandler: 'undo', execCommand: 'undo' },
  redo: { editorHandler: 'redo', execCommand: 'redo' },
  'select-all': { editorHandler: 'editor.action.selectAll', execCommand: 'selectAll' },
} as const satisfies Partial<Record<MenuCommand, { editorHandler: string; execCommand: string }>>;

/** Commands the shown page implements, by the method that does it. */
export const PAGE_COMMAND_METHODS = {
  'focus-url': 'focusAddressBar',
  'toggle-palette': 'togglePalette',
  'toggle-sidebar': 'toggleSidebar',
  'toggle-console': 'toggleConsole',
} as const satisfies Partial<Record<MenuCommand, keyof PageCommands>>;
