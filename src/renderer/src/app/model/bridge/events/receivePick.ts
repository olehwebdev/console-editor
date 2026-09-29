import type { InspectedComponent } from '@common/types';
import { showComponent } from '@/features/inspect/pick';
import { takePickCapture } from '@/features/shot/capture';
import { openShot } from '@/features/shot/open-shot';
import { followComponent } from './followComponent';

/**
 * An element was picked: its component shows on the Component page and in the Components tree, and its code is traced
 * to the originals; picked to be captured, it is captured too.
 */
export function receivePick(component: InspectedComponent): void {
  showComponent(component);
  followComponent(component);
  // Picked to be captured (the shots menu's Element…): taken now, before the page moves on.
  takePickCapture(component.pickId, openShot);
}
