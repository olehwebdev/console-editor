import type { InspectedComponent } from '@common/types';
import { cn } from '@/shared/lib';
import { elementLabel, linkName, useInspectorStore } from '@/entities/inspector';
import { readComponentAt } from '@/features/inspect/pick';

/** The element picked last and what rendered it, the nearest first; pressing a component shows it on the Component page. */
export function PickedChain({ component }: { component: InspectedComponent }) {
  const origins = useInspectorStore((s) => s.origins);
  return (
    <section className="flex flex-col gap-1 px-3" data-testid="inspect-picked">
      <span className="label-caps px-1 pb-1">Picked</span>
      <span className="truncate px-1 font-mono text-[12.5px] text-fg">{elementLabel(component.element)}</span>
      <div className="flex flex-col">
        {component.chain.map((link, depth) => (
          <button
            key={depth}
            type="button"
            onClick={() => void readComponentAt(depth)}
            className={cn('flex h-7 min-w-0 items-center gap-2 rounded-md px-2 text-left text-[13px] hover:bg-hover', depth === component.depth && 'bg-accent/12 text-fg')}
            data-testid="inspect-chain-link"
          >
            <span className="min-w-0 flex-1 truncate">{linkName(link, component.framework, origins)}</span>
            {link.key ? <span className="shrink-0 font-mono text-[11px] text-fg-subtle">key={link.key}</span> : null}
          </button>
        ))}
      </div>
    </section>
  );
}
