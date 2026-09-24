import { useState } from 'react';
import type { MatchType, OverrideMeta, UrlMatcher } from '@common/types';
import { icons, KEY } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Input } from '@/shared/ui/input';
import { Menu } from '@/shared/ui/menu';
import { Switch } from '@/shared/ui/switch';
import { applyMatch } from '@/features/edit-match-rule';
import { sameRule } from './sameRule';

/** The match type menu's entries, in order. */
const MATCH_TYPES: readonly MatchType[] = ['exact', 'glob', 'regex'];

const TYPE_HELP: Record<MatchType, string> = {
  exact: 'This exact URL',
  glob: '* matches anything',
  regex: 'JavaScript regular expression',
};

/** Edits which request URLs an override applies to. Key it by the override, so each one starts from its own rule. */
export function MatchRule({ override }: { override: OverrideMeta }) {
  const saved = override.match;
  // Unapplied edits, with the rule they were made to: once that changes (applied, or changed elsewhere) they are dropped.
  const [draft, setDraft] = useState<{ base: UrlMatcher; rule: UrlMatcher } | null>(null);
  const { type, pattern, ignoreQuery } = draft && sameRule(draft.base, saved) ? draft.rule : saved;
  const edit = (patch: Partial<UrlMatcher>) => setDraft({ base: saved, rule: { type, pattern, ignoreQuery, ...patch } });

  const dirty = type !== saved.type || pattern.trim() !== saved.pattern || ignoreQuery !== saved.ignoreQuery;
  const apply = () => void applyMatch(override.id, { type, pattern: pattern.trim(), ignoreQuery });

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2" data-testid="match-rule">
      <span className="text-[12px] text-fg-subtle">Applies to</span>
      <Menu
        label="Match type"
        items={MATCH_TYPES.map((t) => ({ label: `${t} — ${TYPE_HELP[t]}`, checked: t === type, onSelect: () => edit({ type: t }) }))}
      >
        <Button size="sm" variant="secondary" trailing={<Icon icon={icons.ChevronDownIcon} size={12} />} data-testid="match-type">
          <span className="font-mono">{type}</span>
        </Button>
      </Menu>
      <Input
        size="sm"
        mono
        value={pattern}
        onChange={(e) => edit({ pattern: e.target.value })}
        onKeyDown={(e) => e.key === KEY.enter && dirty && apply()}
        aria-label="URL pattern"
        data-testid="match-pattern"
        className="min-w-[220px] flex-1"
      />
      <Switch size="sm" checked={ignoreQuery} onCheckedChange={(checked) => edit({ ignoreQuery: checked })} label={<span className="text-[12px] text-fg-muted">ignore ?query</span>} />
      <Button size="sm" variant={dirty ? 'primary' : 'ghost'} disabled={!dirty} onClick={apply} className={cn(!dirty && 'opacity-60')}>
        Apply
      </Button>
    </div>
  );
}
