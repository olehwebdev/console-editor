import type { Rule } from '@common/types';
import { icons } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Counter } from '@/shared/ui/counter';
import { IconButton } from '@/shared/ui/icon-button';
import { ContextMenu } from '@/shared/ui/menu';
import { Switch } from '@/shared/ui/switch';
import { Tooltip } from '@/shared/ui/tooltip';
import { RESOURCE_TYPE_LABELS, RULE_ACTION_TITLES, RULE_HIT_TOOLTIPS, RuleActionIcon, ruleLabel, useRuleStore } from '@/entities/rule';
import { deleteRule } from '@/features/rule/delete';
import { openRuleEditor } from '@/features/rule/edit';
import { setRuleEnabled } from '@/features/rule/toggle';
import { ROW_ICON_SIZE } from '../constants';
import { ruleMenu } from './ruleMenu';

/** One rule: its switch, what it does and to what, its hits and actions (also in its context menu). */
export function RuleRow({ rule, active }: { rule: Rule; active: boolean }) {
  const hits = useRuleStore((s) => s.hits[rule.id] ?? 0);
  const label = ruleLabel(rule);
  const types = rule.resourceTypes.map((type) => RESOURCE_TYPE_LABELS[type]);

  return (
    <ContextMenu items={ruleMenu(rule)} label={`${label} actions`}>
      <div
        role="listitem"
        data-hover-row
        data-testid="rule-row"
        data-rule-id={rule.id}
        title={`${RULE_ACTION_TITLES[rule.action]}\nmatch (${rule.match.type}): ${rule.match.pattern}${types.length ? `\ntypes: ${types.join(', ')}` : ''}`}
        onClick={() => openRuleEditor(rule)}
        className={cn(
          'group relative flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-[13px]',
          active && 'bg-accent/10 text-fg before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-accent',
        )}
      >
        <span onClick={(e) => e.stopPropagation()} className="flex">
          <Switch
            size="sm"
            tone="live"
            checked={rule.enabled}
            onCheckedChange={(on) => void setRuleEnabled(rule.id, on)}
            aria-label={rule.enabled ? 'Turn rule off' : 'Turn rule on'}
          />
        </span>
        <RuleActionIcon action={rule.action} size={ROW_ICON_SIZE} />
        <span className={cn('min-w-0 flex-1 truncate', rule.enabled ? 'text-fg' : 'text-fg-subtle line-through decoration-fg-subtle/60')}>{label}</span>
        {rule.match.type !== 'exact' ? <span className="rounded-full bg-hover px-1.5 font-mono text-[10px] text-fg-muted">{rule.match.type}</span> : null}
        {types.length ? (
          <span className="max-w-[88px] shrink-0 truncate rounded-full bg-hover px-1.5 text-[10px] text-fg-muted">
            {types.length === 1 ? types[0] : `${types.length} types`}
          </span>
        ) : null}
        {hits > 0 ? (
          <Tooltip content={RULE_HIT_TOOLTIPS[rule.action](hits)}>
            <span data-testid="rule-hits" className="min-w-5 rounded-full bg-hover px-1.5 text-center text-[10.5px] font-medium text-fg-muted">
              <Counter value={hits} />
            </span>
          </Tooltip>
        ) : null}
        <IconButton
          icon={icons.DeleteIcon}
          label="Delete rule"
          size="sm"
          danger
          className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            void deleteRule(rule.id);
          }}
        />
      </div>
    </ContextMenu>
  );
}
