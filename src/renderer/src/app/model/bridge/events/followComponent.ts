import type { InspectedComponent } from '@common/types';
import { nodeLocations } from '@/entities/inspector';
import { titleComponentTab } from '@/features/inspect/pick';
import { revealInTree } from '@/features/inspect/tree';
import { locateComponent, locateLocations } from '@/features/open-resource';

/** A component was shown (picked, or read again): its code is traced to the originals, and it is revealed in the Components tree. */
export function followComponent(component: InspectedComponent): void {
  void locateComponent(component).then(titleComponentTab);
  void revealInTree(component).then((levels) => locateLocations(nodeLocations(levels)));
}
