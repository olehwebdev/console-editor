import type { Shot } from '@common/types';

/** A shot's size in CSS pixels (a 2× design's is half its pixels). */
export function cssSize(shot: Pick<Shot, 'width' | 'height' | 'scale'>): { width: number; height: number } {
  return { width: Math.round(shot.width / shot.scale), height: Math.round(shot.height / shot.scale) };
}
