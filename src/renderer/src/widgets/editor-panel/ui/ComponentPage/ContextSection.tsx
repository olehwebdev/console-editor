import type { InspectedComponent } from '@common/types';
import { linkName, useInspectorStore } from '@/entities/inspector';
import { CodeLink } from '@/features/open-resource';

/** The contexts a React component reads, with who provides each; what a Vue component provides. */
export function ContextSection({ component }: { component: InspectedComponent }) {
  const origins = useInspectorStore((s) => s.origins);
  if (!component.context.length) return null;
  return (
    <section className="flex flex-col gap-1.5" data-testid="component-context">
      <h2 className="label-caps">Context</h2>
      <div className="flex flex-col rounded-xl border border-line bg-surface py-1">
        {component.context.map((context, index) => (
          <div key={`${context.name}:${index}`} className="flex min-w-0 items-baseline gap-3 px-3.5 py-1 text-[12.5px]">
            <span className="w-32 shrink-0 truncate font-mono text-fg-muted">{context.name}</span>
            <span className="min-w-0 flex-1 truncate font-mono text-fg">{context.preview}</span>
            <span className="shrink-0 text-fg-subtle">{context.provider ? `from ${linkName({ name: context.provider, key: null, location: context.location }, component.framework, origins)}` : 'default value'}</span>
            <CodeLink location={context.location} />
          </div>
        ))}
      </div>
    </section>
  );
}
