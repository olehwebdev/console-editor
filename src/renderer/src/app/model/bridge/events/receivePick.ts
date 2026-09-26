import type { InspectedComponent } from '@common/types';
import { showComponent } from '@/features/inspect/pick';
import { followComponent } from './followComponent';

/** An element was picked: its component shows on the Component page and in the Components tree, and its code is traced to the originals. */
export function receivePick(component: InspectedComponent): void {
  showComponent(component);
  followComponent(component);
}
