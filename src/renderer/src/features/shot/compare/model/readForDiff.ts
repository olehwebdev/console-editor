import { api } from '@/shared/api';
import type { DiffImage } from '../lib/workerTypes';
import type { DiffSource } from './types';

/** A shot's file, read for the worker, with the size it is compared at. */
export async function readForDiff(source: DiffSource): Promise<DiffImage> {
  return { bytes: new Uint8Array(await api.readShot(source.id)).buffer, width: source.width, height: source.height };
}
