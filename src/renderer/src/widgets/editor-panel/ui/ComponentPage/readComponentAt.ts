import { inspectDepth, titleComponentTab } from '@/features/inspect/pick';
import { locateComponent } from '@/features/open-resource';

/** Reads a component of the picked element's chain as it is now, shows it, and traces its code to the originals. */
export async function readComponentAt(depth: number): Promise<void> {
  const component = await inspectDepth(depth);
  if (!component) return;
  await locateComponent(component);
  titleComponentTab();
}
