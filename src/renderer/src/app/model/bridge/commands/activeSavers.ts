import { applyRulePage, createRulePage } from '@/features/rule/edit';
import { saveTab } from '@/features/save-override';
import type { ActiveSavers } from './types';

/** Save (Ctrl/Cmd+S) by what is in front: a file is saved as an override, a rule page applied or created. */
export const ACTIVE_SAVERS: ActiveSavers = {
  // Called without the id: saveTab saves the active tab.
  file: () => void saveTab(),
  'whats-new': () => undefined,
  stack: () => undefined,
  rule: (id) => void applyRulePage(id),
  'new-rule': (id) => void createRulePage(id),
};
