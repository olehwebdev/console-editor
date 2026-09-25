import type { InspectedComponent } from '@common/types';
import { showComponent, titleComponentTab } from '@/features/inspect/pick';
import { locateComponent } from '@/features/open-resource';

/** An element was picked: its component shows on the Component page, and its code is traced to the originals. */
export function receivePick(component: InspectedComponent): void {
  showComponent(component);
  void locateComponent(component).then(titleComponentTab);
}
