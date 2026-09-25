import { CONTINUE } from './constants';
import { resumeHeld } from './resumeHeld';

/** Send original: lets a held request go as it would have, the edits dropped. */
export function sendOriginal(heldId: string): Promise<boolean> {
  return resumeHeld(heldId, CONTINUE);
}
