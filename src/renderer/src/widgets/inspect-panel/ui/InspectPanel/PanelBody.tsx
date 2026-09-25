import { useInspectorStore } from '@/entities/inspector';
import { PickedChain } from './PickedChain';
import { PickHint } from './PickHint';
import { PickingNotice } from './PickingNotice';
import { UnderPointer } from './UnderPointer';

/** While picking, what is under the pointer; else the element picked last, or what picking does. */
export function PanelBody() {
  const picking = useInspectorStore((s) => s.picking);
  const component = useInspectorStore((s) => s.component);
  if (picking) {
    return (
      <>
        <PickingNotice />
        <UnderPointer />
      </>
    );
  }
  return component ? <PickedChain component={component} /> : <PickHint />;
}
