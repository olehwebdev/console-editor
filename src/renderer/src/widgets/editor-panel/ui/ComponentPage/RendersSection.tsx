import { useMemo } from 'react';
import type { InspectedComponent } from '@common/types';
import { formatTime } from '@/shared/lib';
import { Button } from '@/shared/ui/button';
import { locationKey, renderedWhy, renderKey, triggerLabel, useInspectorStore, useRenderLog } from '@/entities/inspector';
import { recordRenders } from '@/features/inspect/renders';
import { MAX_COMPONENT_RENDERS } from './constants';

/** A React component's renders in the Renders log (same function, key and frame), the newest first, each with why and what triggered it. */
export function RendersSection({ component }: { component: InspectedComponent }) {
  const link = component.chain[component.depth];
  const key = link ? renderKey(link.location, link.key) : null;
  const commits = useRenderLog((s) => s.commits);
  const recording = useRenderLog((s) => s.recording);
  const hookNames = useInspectorStore((s) => (link?.location ? s.hookNames[locationKey(link.location)] : undefined));
  // Up to 2,000 commits of 200 components: matched once per batch, not per render.
  const renders = useMemo(
    () =>
      key
        ? commits
            .filter((commit) => commit.frameId === component.frameId)
            .flatMap((commit) => commit.components.flatMap((rendered, index) => (renderKey(rendered.location, rendered.key) === key ? [{ commit, rendered, index }] : [])))
            .reverse()
        : [],
    [commits, component.frameId, key],
  );
  if (component.framework !== 'react' || !key) return null;
  return (
    <section className="flex flex-col gap-1.5" data-testid="component-renders">
      <h2 className="label-caps">Renders{renders.length ? ` · ${renders.length}` : ''}</h2>
      {renders.length ? (
        <div className="flex flex-col rounded-xl border border-line bg-surface py-1">
          {renders.slice(0, MAX_COMPONENT_RENDERS).map(({ commit, rendered, index }) => (
            // Two instances of it with no key can render in one commit.
            <div key={`${commit.id}:${index}`} className="flex min-h-7 min-w-0 items-center gap-3 px-3.5 py-0.5 text-[12.5px]" data-testid="component-render">
              <span className="shrink-0 font-mono text-fg-subtle">#{commit.id}</span>
              <span className="shrink-0 tabular-nums text-fg-subtle">{formatTime(commit.at)}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-fg">{renderedWhy(rendered, hookNames)}</span>
              <span className="max-w-[35%] shrink-0 truncate text-fg-subtle">{triggerLabel(commit)}</span>
            </div>
          ))}
        </div>
      ) : recording ? (
        <p className="text-[12.5px] text-fg-subtle">It hasn't rendered since recording started.</p>
      ) : (
        <div className="flex items-center gap-3 text-[12.5px] text-fg-subtle">
          Record renders to see each time it renders, and why.
          <Button size="sm" variant="secondary" onClick={() => void recordRenders(true)}>
            Record renders
          </Button>
        </div>
      )}
    </section>
  );
}
