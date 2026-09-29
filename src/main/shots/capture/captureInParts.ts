import type { Rect } from '../../../shared/types';
import { MAX_TEXTURE_SIDE, PART_SIDE } from '../constants';
import { stitchPngs } from '../png';
import { partHeight } from './partHeight';
import { partsOf } from './partsOf';

/**
 * Captures `clip` of a document (CSS pixels) as a PNG with `shoot`, at `ratio` device pixels per CSS pixel: at once
 * when it fits in a texture, else in parts, one after another (each lays the page out for its own), joined.
 */
export async function captureInParts(clip: Rect, ratio: number, shoot: (part: Rect) => Promise<Buffer>): Promise<Buffer> {
  if (clip.height * ratio <= MAX_TEXTURE_SIDE) return shoot(clip);
  const parts: Buffer[] = [];
  for (const part of partsOf(clip, partHeight(PART_SIDE, ratio))) parts.push(await shoot(part));
  return stitchPngs(parts);
}
