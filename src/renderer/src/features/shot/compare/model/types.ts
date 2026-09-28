import type { Rect } from '@common/types';

/** Where comparing two shots is at: not asked, working, its result, or why it failed. */
export type DiffState =
  | { status: 'idle' | 'working' }
  | { status: 'done'; image: ImageBitmap; differing: number; total: number; regions: Rect[] }
  | { status: 'failed'; error: string };

/** A shot as compared: which file, and the size it is drawn at (CSS pixels). */
export interface DiffSource {
  id: string;
  /** Changes when the shot does (its last change's time). */
  version: number;
  width: number;
  height: number;
}
