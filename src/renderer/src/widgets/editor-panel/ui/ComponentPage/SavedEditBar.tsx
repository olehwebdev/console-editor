import { use } from 'react';
import { stateAction } from '@common/stateAction';
import type { InspectedComponent } from '@common/types';
import { Button } from '@/shared/ui/button';
import { useFrameStore } from '@/entities/frame';
import { linkName, useInspectorStore } from '@/entities/inspector';
import { SaveAsActionContext } from '../../model/SaveAsActionContext';

/**
 * After a value of this component was set: what was set, and **Save as action**, which keeps setting it as
 * an action of its frame (readable code that finds the component and sets the value again); or why it can't.
 */
export function SavedEditBar({ component }: { component: InspectedComponent }) {
  const lastEdit = useInspectorStore((s) => s.lastEdit);
  const origins = useInspectorStore((s) => s.origins);
  const frames = useFrameStore((s) => s.frames);
  const save = use(SaveAsActionContext);
  if (!save || !lastEdit || lastEdit.pickId !== component.pickId || lastEdit.depth !== component.depth) return null;
  const link = component.chain[component.depth];
  const action = stateAction(component, lastEdit.edit, lastEdit.label, link ? linkName(link, component.framework, origins) : undefined);
  return (
    <div className="flex min-h-10 items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-1.5 text-[12.5px]" data-testid="saved-edit">
      <span className="min-w-0 flex-1 truncate text-fg-muted">
        Set <span className="font-mono text-fg">{lastEdit.label}</span> to <span className="font-mono text-fg">{lastEdit.edit.json}</span>.
      </span>
      {action ? (
        <Button size="sm" variant="secondary" onClick={() => save(action.code, frames.find((f) => f.id === component.frameId), action.name)} data-testid="save-state-action">
          Save as action
        </Button>
      ) : (
        <span className="shrink-0 text-fg-subtle">
          {component.selector ? "Angular's production build gives code in the page no way to its components." : 'No selector reaches its element (it is in a closed shadow root).'}
        </span>
      )}
    </div>
  );
}
