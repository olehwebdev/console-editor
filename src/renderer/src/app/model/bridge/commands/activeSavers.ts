import { applyRulePage, createRulePage } from '@/features/rule/edit';
import { saveFileTab } from '@/widgets/editor-panel';
import type { ActiveSavers } from './types';

/** Save (Ctrl/Cmd+S) by what is in front: a file is saved as an override (a held request sent), a rule page applied or created. */
export const ACTIVE_SAVERS: ActiveSavers = {
  file: () => saveFileTab(),
  'whats-new': () => undefined,
  stack: () => undefined,
  rule: (id) => void applyRulePage(id),
  'new-rule': (id) => void createRulePage(id),
};
