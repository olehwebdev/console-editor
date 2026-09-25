import type { Rule } from '@common/types';
import { useTabStore } from '@/entities/editor-tab';
import { ruleLabel, toRuleInput } from '@/entities/rule';
import { useWorkspaceStore } from '@/entities/workspace';
import { openRuleForm } from './openRuleForm';
import { rulePageId } from './rulePageId';

/** Opens (or switches to, retitling it) a rule's page. Its unapplied edits stay. Refused while workspaces switch. */
export function openRuleEditor(rule: Rule): void {
  if (useWorkspaceStore.getState().switchingTo !== null) return;
  const id = rulePageId(rule.id);
  openRuleForm(id, toRuleInput(rule));
  useTabStore.getState().openPage({ id, page: 'rule', ruleId: rule.id, title: ruleLabel(rule) });
}
