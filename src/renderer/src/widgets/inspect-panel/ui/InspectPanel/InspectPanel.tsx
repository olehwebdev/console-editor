import { useInspectorStore } from '@/entities/inspector';
import { ComponentTree } from '../ComponentTree';
import { PanelBody } from './PanelBody';
import { PanelHeader } from './PanelHeader';
import { StackSummary } from './StackSummary';

/** The Inspect view: picking an element in the page, what rendered the one picked, a frame's components, and what each frame runs. */
export function InspectPanel() {
  const picking = useInspectorStore((s) => s.picking);
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="inspect-panel">
      <PanelHeader picking={picking} />
      <div className="min-h-0 flex-1 overflow-y-auto pb-3">
        <PanelBody />
        <ComponentTree />
        <StackSummary />
      </div>
    </div>
  );
}
