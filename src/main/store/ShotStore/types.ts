import type { Shot } from '../../../shared/types';
import type { SHOT_EXTENSIONS } from './constants';

export type ShotExtension = (typeof SHOT_EXTENSIONS)[number];

/** A shot as kept: which workspace it belongs to, and its image's type. */
export interface StoredShot extends Shot {
  workspaceId: string;
  ext: ShotExtension;
}

export interface ShotsFile {
  version: number;
  shots: StoredShot[];
}

/** What a new shot is made of: its record's fields, its image and its thumbnail (the store gives its id and times). */
export interface NewShot extends Omit<Shot, 'id' | 'createdAt' | 'updatedAt'> {
  bytes: Buffer;
  ext: ShotExtension;
  /** A small JPEG of its top, for lists; null when it couldn't be made. */
  thumb: Buffer | null;
}
