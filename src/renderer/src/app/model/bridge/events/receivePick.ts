import type { InspectedComponent } from '@common/types';
import { nodeLocations } from '@/entities/inspector';
import { showComponent, titleComponentTab } from '@/features/inspect/pick';
import { revealInTree } from '@/features/inspect/tree';
import { locateComponent, locateLocations } from '@/features/open-resource';

/** An element was picked: its component shows on the Component page and in the Components tree, and its code is traced to the originals. */
export function receivePick(component: InspectedComponent): void {
  showComponent(component);
  void locateComponent(component).then(titleComponentTab);
  void revealInTree(component).then((levels) => locateLocations(nodeLocations(levels)));
}
