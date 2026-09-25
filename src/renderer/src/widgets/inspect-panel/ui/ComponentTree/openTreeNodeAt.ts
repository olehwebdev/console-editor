import { showComponent, titleComponentTab } from '@/features/inspect/pick';
import { openNode } from '@/features/inspect/tree';
import { locateComponent } from '@/features/open-resource';

/** Opens a node of the tree on the Component page, as a pick of its first element, and traces its code to the originals. */
export async function openTreeNodeAt(path: number[]): Promise<void> {
  const component = await openNode(path);
  if (!component) return;
  showComponent(component);
  await locateComponent(component);
  titleComponentTab();
}
