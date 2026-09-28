import type { Shot } from '@common/types';
import type { DiffSource } from '@/features/shot/compare';
import { cssSize } from './cssSize';

/** A shot as compared: drawn at its CSS size, compared again when it changes. */
export function sourceOf(shot: Shot): DiffSource {
  return { id: shot.id, version: shot.updatedAt, ...cssSize(shot) };
}
