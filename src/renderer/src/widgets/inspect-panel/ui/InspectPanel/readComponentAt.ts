import { nodeLocations } from '@/entities/inspector';
import { inspectDepth, titleComponentTab } from '@/features/inspect/pick';
import { revealInTree } from '@/features/inspect/tree';
import { locateComponent, locateLocations } from '@/features/open-resource';

/** Reads a component of the picked element's chain as it is now, shows it, and traces its code to the originals. */
export async function readComponentAt(depth: number): Promise<void> {
  const component = await inspectDepth(depth);
  if (!component) return;
  void revealInTree(component).then((levels) => locateLocations(nodeLocations(levels)));
  await locateComponent(component);
  titleComponentTab();
}
