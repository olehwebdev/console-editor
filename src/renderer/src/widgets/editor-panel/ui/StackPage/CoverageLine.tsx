import type { ScriptCoverage } from '@common/types';
import { icons } from '@/shared/config';
import { cn, fileName } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';

/**
 * How many of a frame's scripts name a source map, and some that don't: without one, the inspector shows
 * minified names and the bundle's lines for their code.
 */
export function CoverageLine({ coverage }: { coverage: ScriptCoverage | null | undefined }) {
  if (!coverage?.scripts) return null;
  const partial = coverage.mapped < coverage.scripts;
  return (
    <footer className="flex min-w-0 flex-col gap-1 border-t border-line px-3.5 py-2 text-[12.5px]" data-testid="stack-coverage">
      <span className={cn('flex items-center gap-1.5', partial ? 'text-warning' : 'text-fg-muted')}>
        {partial ? <Icon icon={icons.WarningIcon} size={13} /> : null}
        Source maps: {coverage.mapped} of {coverage.scripts} {coverage.scripts === 1 ? 'script' : 'scripts'}
        {coverage.mapped ? '' : ': names and files stay minified'}
      </span>
      {coverage.unmapped.length ? (
        <span className="truncate font-mono text-[12px] text-fg-subtle" title={coverage.unmapped.join('\n')}>
          None for {coverage.unmapped.map(fileName).join(', ')}
          {coverage.scripts - coverage.mapped > coverage.unmapped.length ? ', …' : ''}
        </span>
      ) : null}
    </footer>
  );
}
