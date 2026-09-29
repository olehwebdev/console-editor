import type { Shot } from '@common/types';
import { captureShot } from './captureShot';
import { capturePick } from './capturePick';

/** An element was picked: captures it if picking was started to capture one (once), or does nothing. */
export function takePickCapture(pickId: string, onOpen: (shot: Shot) => void): void {
  if (!capturePick.next) return;
  capturePick.next = false;
  void captureShot('element', pickId, onOpen);
}
