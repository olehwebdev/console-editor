import { useState } from 'react';
import { sameMatcher } from '@common/matcher';
import type { OverrideMeta, UrlMatcher } from '@common/types';
import { cn } from '@/shared/lib';
import { Button } from '@/shared/ui/button';
import { UrlMatcherFields } from '@/shared/ui/url-matcher';
import { applyMatch } from '@/features/edit-match-rule';

/** Edits which request URLs an override applies to. Key it by the override, so each one starts from its own rule. */
export function MatchRule({ override }: { override: OverrideMeta }) {
  const saved = override.match;
  // Unapplied edits, with the rule they were made to: once that changes (applied, or changed elsewhere) they are dropped.
  const [draft, setDraft] = useState<{ base: UrlMatcher; rule: UrlMatcher } | null>(null);
  const rule = draft && sameMatcher(draft.base, saved) ? draft.rule : saved;
  const { type, pattern, ignoreQuery } = rule;

  const dirty = type !== saved.type || pattern.trim() !== saved.pattern || ignoreQuery !== saved.ignoreQuery;
  const apply = () => void applyMatch(override.id, { type, pattern: pattern.trim(), ignoreQuery });

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2" data-testid="match-rule">
      <span className="text-[12px] text-fg-subtle">Applies to</span>
      <UrlMatcherFields value={rule} onChange={(next) => setDraft({ base: saved, rule: next })} onEnter={() => dirty && apply()} />
      <Button size="sm" variant={dirty ? 'primary' : 'ghost'} disabled={!dirty} onClick={apply} className={cn(!dirty && 'opacity-60')}>
        Apply
      </Button>
    </div>
  );
}
