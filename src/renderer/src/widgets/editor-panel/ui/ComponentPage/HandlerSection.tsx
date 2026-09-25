import type { InspectedComponent } from '@common/types';
import { locationKey, useInspectorStore } from '@/entities/inspector';
import { CodeLink } from '@/features/open-resource';

/** The listeners on the picked element: the prop each came from, the function it runs, and where that is defined. */
export function HandlerSection({ component }: { component: InspectedComponent }) {
  const origins = useInspectorStore((s) => s.origins);
  if (!component.handlers.length) return null;
  return (
    <section className="flex flex-col gap-1.5" data-testid="component-handlers">
      <h2 className="label-caps">On this element</h2>
      <div className="flex flex-col rounded-xl border border-line bg-surface py-1">
        {component.handlers.map((handler, index) => (
          <div key={`${handler.name}:${index}`} className="flex min-w-0 items-baseline gap-3 px-3.5 py-1 text-[12.5px]">
            <span className="w-32 shrink-0 truncate font-mono text-fg-muted">{handler.name}</span>
            <span className="min-w-0 flex-1 truncate font-mono text-fg">→ {(handler.location && origins[locationKey(handler.location)]?.name) || handler.function}</span>
            <CodeLink location={handler.location} />
          </div>
        ))}
      </div>
    </section>
  );
}
