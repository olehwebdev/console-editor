import { toggleBaseDiff } from '@/features/compare-changes';
import { formatTab } from '@/features/format-document';
import { jumpToMappedCode } from '@/features/open-resource';
import { checkForUpdatesNow, openWhatsNew } from '@/features/update-app';
import { runEditCommand } from './runEditCommand';
import { runPageCommand } from './runPageCommand';
import { saveActive } from './saveActive';
import type { MenuCommandHandlers } from './types';

/** What each app menu command does. Annotated rather than `satisfies`: `runCommand`'s generic lookup needs the mapped type. */
export const MENU_COMMAND_HANDLERS: MenuCommandHandlers = {
  // Called, not referenced: saveActive takes no command, and formatTab an optional tab id, which the command would fill.
  save: () => saveActive(),
  format: () => void formatTab(),
  'toggle-diff': () => toggleBaseDiff(),
  'focus-url': runPageCommand,
  'toggle-palette': runPageCommand,
  'toggle-sidebar': runPageCommand,
  'toggle-console': runPageCommand,
  undo: runEditCommand,
  redo: runEditCommand,
  'select-all': runEditCommand,
  'whats-new': () => openWhatsNew(),
  'check-updates': () => void checkForUpdatesNow(),
  'jump-to-mapped': () => void jumpToMappedCode(),
};
