import type { ReactNode } from 'react';
import type { RuleAction } from '@common/types';
import { RULE_ACTION_TITLES, RuleActionIcon } from '@/entities/rule';

/** A rule page's title row: what the rule does, what it applies to, and its controls. */
export function RulePageHeader({ action, title, children }: { action: RuleAction; title: string; children?: ReactNode }) {
  return (
    <header className="flex items-center gap-3.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-raised">
        <RuleActionIcon action={action} size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[18px] font-semibold tracking-tight text-fg" title={title}>
          {title}
        </h1>
        <p className="text-[13px] text-fg-muted">{RULE_ACTION_TITLES[action]}</p>
      </div>
      {children}
    </header>
  );
}
