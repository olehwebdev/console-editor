import { lastRendered, renderKey, treeRows, useRenderLog, useTreeStore } from '@/entities/inspector';
import { INDENT_PX, MORE_START_PX } from './constants';
import { TreeHeader } from './TreeHeader';
import { TreeRowView } from './TreeRowView';
import { useTreeFrame } from './useTreeFrame';

/** The components of a frame, a level at a time from the top: React's and Vue's, in any frame the page stack found them in. */
export function ComponentTree() {
  const { frames, frameId } = useTreeFrame();
  const levels = useTreeStore((s) => s.levels);
  const expanded = useTreeStore((s) => s.expanded);
  const rows = treeRows(levels, expanded);
  const fresh = lastRendered(useRenderLog((s) => s.commits), frameId);
  const top = levels[''];
  return (
    <section className="mt-4 flex flex-col gap-0.5 border-t border-line px-3 pt-3" data-testid="component-tree">
      <TreeHeader frames={frames} frameId={frameId} />
      <div role="tree" aria-label="Components" className="flex flex-col">
        {rows.map((row) =>
          row.kind === 'node' ? (
            <TreeRowView key={row.key} row={row} fresh={fresh.has(renderKey(row.node.location, row.node.key) ?? '')} />
          ) : (
            <span key={row.key} className="px-1 py-1 text-[12px] text-fg-subtle" style={{ paddingLeft: MORE_START_PX + row.depth * INDENT_PX }}>
              {row.more} more not listed
            </span>
          ),
        )}
      </div>
      {frameId ? null : <span className="px-1 text-[12px] text-fg-subtle">No React, Vue, Angular or Lit in the page's frames.</span>}
      {frameId && top === null ? <span className="px-1 text-[12px] text-fg-subtle">Couldn't read this frame's components: read them again.</span> : null}
    </section>
  );
}
