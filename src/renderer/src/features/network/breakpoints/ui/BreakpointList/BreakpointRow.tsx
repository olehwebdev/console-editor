import { ANY_METHOD } from '@common/overrides';
import type { Breakpoint } from '@common/types';
import { icons } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';
import { Switch } from '@/shared/ui/switch';
import { removeBreakpoint, STAGE_LABELS, toggleBreakpoint } from '../../model';

/** One breakpoint: on or off, what it stops (method, URL pattern) and where, and a way to remove it. */
export function BreakpointRow({ breakpoint }: { breakpoint: Breakpoint }) {
  const { id, enabled, method, match, stage } = breakpoint;
  return (
    <li className="flex h-7 min-w-0 items-center gap-2" data-testid="breakpoint-row">
      <Switch size="sm" checked={enabled} onCheckedChange={() => void toggleBreakpoint(id)} aria-label={enabled ? 'Turn the breakpoint off' : 'Turn the breakpoint on'} />
      <span className="w-12 shrink-0 font-mono text-[12px] text-fg-muted">{method === ANY_METHOD ? 'Any' : method}</span>
      <span className="min-w-0 flex-1 truncate font-mono text-[12px]" title={`${match.type}: ${match.pattern}${match.ignoreQuery ? ' (any query)' : ''}`}>
        {match.pattern}
      </span>
      <span className="shrink-0 text-[11px] text-fg-subtle">{STAGE_LABELS[stage]}</span>
      <IconButton icon={icons.DeleteIcon} label="Remove the breakpoint" size="sm" onClick={() => void removeBreakpoint(id)} />
    </li>
  );
}
