import type { RenderedComponent } from '@common/types';
import { cn } from '@/shared/lib';
import { linkName, locationKey, renderedWhy, useInspectorStore } from '@/entities/inspector';
import { CodeLink } from '@/features/open-resource';

/** A component in a commit: its name (its original's, once known), key, and why it took part; a skipped one is dimmed. */
export function RenderedRow({ component }: { component: RenderedComponent }) {
  const origins = useInspectorStore((s) => s.origins);
  const hookNames = useInspectorStore((s) => (component.location ? s.hookNames[locationKey(component.location)] : undefined));
  return (
    <div className={cn('flex min-h-6 min-w-0 items-center gap-3 pl-6 pr-3 text-[12.5px]', component.kind === 'skip' && 'opacity-55')} data-testid="rendered-component">
      <span className="w-40 shrink-0 truncate">
        {linkName(component, 'react', origins)}
        {component.key ? <span className="ml-1.5 font-mono text-[11px] text-fg-subtle">key={component.key}</span> : null}
      </span>
      <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-fg-muted" data-testid="rendered-why">
        {renderedWhy(component, hookNames)}
      </span>
      <CodeLink location={component.location} />
    </div>
  );
}
