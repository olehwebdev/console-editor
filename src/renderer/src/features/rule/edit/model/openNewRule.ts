import type { CreateRuleInput } from '@common/types';
import { useTabStore } from '@/entities/editor-tab';
import { RULE_ACTION_TITLES } from '@/entities/rule';
import { useWorkspaceStore } from '@/entities/workspace';
import { NEW_RULE_PAGE_PREFIX } from './constants';
import { openRuleForm } from './openRuleForm';

/** Opens a page for writing a new rule, starting from `seed`. Refused while workspaces switch. */
export function openNewRule(seed: CreateRuleInput): void {
  if (useWorkspaceStore.getState().switchingTo !== null) return;
  const id = `${NEW_RULE_PAGE_PREFIX}${crypto.randomUUID()}`;
  openRuleForm(id, seed);
  useTabStore.getState().openPage({ id, page: 'new-rule', seed, title: `New ${RULE_ACTION_TITLES[seed.action].toLowerCase()}` });
}
