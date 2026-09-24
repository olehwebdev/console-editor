import { useEffect, useState } from 'react';
import type { MatchType, OverrideMeta } from '@common/types';
import { icons } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Input } from '@/shared/ui/input';
import { Menu } from '@/shared/ui/menu';
import { Switch } from '@/shared/ui/switch';
import { applyMatch } from '@/features/edit-match-rule';

const TYPE_HELP: Record<MatchType, string> = {
  exact: 'This exact URL',
  glob: '* matches anything',
  regex: 'JavaScript regular expression',
};

/** Edits which request URLs an override applies to. */
export function MatchRule({ override }: { override: OverrideMeta }) {
  const [type, setType] = useState<MatchType>(override.match.type);
  const [pattern, setPattern] = useState(override.match.pattern);
  const [ignoreQuery, setIgnoreQuery] = useState(override.match.ignoreQuery);

  useEffect(() => {
    setType(override.match.type);
    setPattern(override.match.pattern);
    setIgnoreQuery(override.match.ignoreQuery);
  }, [override.match.type, override.match.pattern, override.match.ignoreQuery]);

  const dirty = type !== override.match.type || pattern.trim() !== override.match.pattern || ignoreQuery !== override.match.ignoreQuery;
  const apply = () => void applyMatch(override.id, { type, pattern: pattern.trim(), ignoreQuery });

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2" data-testid="match-rule">
      <span className="text-[12px] text-fg-subtle">Applies to</span>
      <Menu
        label="Match type"
        items={(['exact', 'glob', 'regex'] as MatchType[]).map((t) => ({ label: `${t} — ${TYPE_HELP[t]}`, checked: t === type, onSelect: () => setType(t) }))}
      >
        <Button size="sm" variant="secondary" trailing={<Icon icon={icons.ChevronDownIcon} size={12} />} data-testid="match-type">
          <span className="font-mono">{type}</span>
        </Button>
      </Menu>
      <Input
        size="sm"
        mono
        value={pattern}
        onChange={(e) => setPattern(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && dirty && apply()}
        aria-label="URL pattern"
        data-testid="match-pattern"
        className="min-w-[220px] flex-1"
      />
      <Switch size="sm" checked={ignoreQuery} onCheckedChange={setIgnoreQuery} label={<span className="text-[12px] text-fg-muted">ignore ?query</span>} />
      <Button size="sm" variant={dirty ? 'primary' : 'ghost'} disabled={!dirty} onClick={apply} className={cn(!dirty && 'opacity-60')}>
        Apply
      </Button>
    </div>
  );
}
