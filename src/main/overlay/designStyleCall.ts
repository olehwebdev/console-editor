import { overlayCall } from './overlayCall';
import { overlayStyle } from './overlayStyle';
import type { PageDesign } from './types';

/** The overlay's call that styles a design as its settings say (`hidden` hides it: a capture is taken without it). */
export function designStyleCall({ settings, width, height }: PageDesign, hidden: boolean): string {
  return overlayCall('setStyle', overlayStyle({ ...settings, hidden: hidden || settings.hidden }, width, height), settings.blend);
}
