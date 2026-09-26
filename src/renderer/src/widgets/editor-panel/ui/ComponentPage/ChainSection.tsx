import type { InspectedComponent } from '@common/types';
import { cn } from '@/shared/lib';
import { linkName, useInspectorStore } from '@/entities/inspector';
import { readComponentAt } from '@/features/inspect/pick';

/** What rendered the element, from the root down to it: pressing a component shows it. */
export function ChainSection({ component }: { component: InspectedComponent }) {
  const origins = useInspectorStore((s) => s.origins);
  const links = component.chain.map((link, depth) => ({ link, depth })).reverse();
  return (
    <section className="flex flex-col gap-1.5" data-testid="component-chain">
      <h2 className="label-caps">Rendered by</h2>
      <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
        {links.map(({ link, depth }, index) => (
          <span key={depth} className="flex items-center gap-1.5">
            {index ? <span className="text-fg-subtle">›</span> : null}
            <button
              type="button"
              onClick={() => void readComponentAt(depth)}
              className={cn('rounded-md px-2 py-0.5 hover:bg-hover', depth === component.depth ? 'bg-accent/15 font-medium text-accent' : 'bg-surface-raised text-fg-muted')}
              data-testid="component-chain-link"
            >
              {linkName(link, component.framework, origins)}
            </button>
          </span>
        ))}
      </div>
    </section>
  );
}
