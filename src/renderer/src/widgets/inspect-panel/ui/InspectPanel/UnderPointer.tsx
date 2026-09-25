import { elementLabel, useInspectorStore } from '@/entities/inspector';

/** What is under the pointer while picking: the element, and the components that rendered it, the nearest first. */
export function UnderPointer() {
  const hover = useInspectorStore((s) => s.hover);
  return (
    <section className="flex flex-col gap-1 px-3" data-testid="inspect-hover">
      <span className="label-caps px-1 pb-1">Under the pointer</span>
      {hover ? (
        <>
          <span className="truncate px-1 font-mono text-[12.5px] text-fg">{elementLabel(hover.element)}</span>
          {hover.chain.length ? (
            <ol className="ml-2 flex flex-col border-l border-line-strong pl-2.5 text-[12.5px]">
              {hover.chain.map((name, index) => (
                <li key={`${name}:${index}`} className={index ? 'truncate text-fg-muted' : 'truncate font-medium text-fg'}>
                  {name}
                </li>
              ))}
            </ol>
          ) : (
            <span className="px-1 text-[12px] text-fg-subtle">No React or Vue component rendered it.</span>
          )}
        </>
      ) : (
        <span className="px-1 text-[12px] text-fg-subtle">Move the pointer over the page.</span>
      )}
    </section>
  );
}
