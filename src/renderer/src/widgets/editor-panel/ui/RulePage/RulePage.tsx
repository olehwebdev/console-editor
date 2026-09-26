import { icons } from '@/shared/config';
import { Counter } from '@/shared/ui/counter';
import { EmptyState } from '@/shared/ui/empty-state';
import { IconButton } from '@/shared/ui/icon-button';
import { Switch } from '@/shared/ui/switch';
import { Tooltip } from '@/shared/ui/tooltip';
import type { PageTabOf } from '@/entities/editor-tab';
import { RULE_HIT_TOOLTIPS, ruleLabel, useRuleStore } from '@/entities/rule';
import { deleteRule } from '@/features/rule/delete';
import { applyRulePage, RuleForm } from '@/features/rule/edit';
import { setRuleEnabled } from '@/features/rule/toggle';
import { RecentRequests } from './RecentRequests';
import { RulePageHeader } from './RulePageHeader';

/** A saved rule's editor: on/off, hits and delete, the form (its edits kept on the tab), and what it matched lately. */
export function RulePage({ page }: { page: PageTabOf<'rule'> }) {
  const rule = useRuleStore((s) => s.byId[page.ruleId]);
  const hits = useRuleStore((s) => s.hits[page.ruleId] ?? 0);

  return (
    <div className="h-full overflow-y-auto bg-surface-editor" data-testid="rule-page">
      {rule ? (
        <div className="mx-auto flex w-full max-w-[720px] flex-col gap-8 px-8 pb-16 pt-10">
          <RulePageHeader action={rule.action} title={ruleLabel(rule)}>
            <Switch
              tone="live"
              checked={rule.enabled}
              onCheckedChange={(on) => void setRuleEnabled(rule.id, on)}
              aria-label={rule.enabled ? 'Turn rule off' : 'Turn rule on'}
              label={<span className="text-[12.5px] text-fg-muted">{rule.enabled ? 'On' : 'Off'}</span>}
            />
            <Tooltip content={RULE_HIT_TOOLTIPS[rule.action](hits)}>
              <span data-testid="rule-page-hits" className="min-w-6 rounded-full bg-hover px-2 py-0.5 text-center text-[12px] font-medium tabular-nums text-fg-muted">
                <Counter value={hits} />
              </span>
            </Tooltip>
            <IconButton icon={icons.DeleteIcon} label="Delete rule" danger onClick={() => void deleteRule(rule.id)} />
          </RulePageHeader>
          <RuleForm
            pageId={page.id}
            onSubmit={() => void applyRulePage(page.id)}
            submitLabel="Apply"
          />
          <RecentRequests ruleId={rule.id} />
        </div>
      ) : (
        <EmptyState icon={icons.RulesIcon} title="This rule was deleted" className="mt-24" />
      )}
    </div>
  );
}
