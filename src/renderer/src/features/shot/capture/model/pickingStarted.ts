import { capturePick } from './capturePick';

/**
 * Picking started. The first start after `pickToCapture` is its own; a second means that picking ended without a pick
 * (Esc) and the user started picking again for the inspector, which must not capture.
 */
export function pickingStarted(): void {
  if (!capturePick.next) return;
  capturePick.starts += 1;
  if (capturePick.starts > 1) capturePick.next = false;
}
