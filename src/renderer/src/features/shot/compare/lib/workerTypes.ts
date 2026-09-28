import type { Rect } from '@common/types';

/** An image to compare: its file, and the size to draw it at (its CSS pixels: a 2× design drawn at half its pixels). */
export interface DiffImage {
  bytes: ArrayBuffer;
  width: number;
  height: number;
}

export interface DiffRequest {
  id: number;
  a: DiffImage;
  b: DiffImage;
  offset: { x: number; y: number };
  threshold: number;
}

export type DiffResponse = { id: number; image: ImageBitmap; differing: number; total: number; regions: Rect[] } | { id: number; error: string };
