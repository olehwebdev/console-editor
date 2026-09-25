import { STACK_BUILDS, STACK_LIBRARIES, type StackLibraryId } from '../../shared/stackLibraries';
import type { StackHit } from '../../shared/types';
import { cleanVersion } from './cleanVersion';

/** One finding as the page reported it, checked against `STACK_LIBRARIES`; null if it names nothing known. */
export function toStackHit(item: unknown): StackHit | null {
  if (!item || typeof item !== 'object') return null;
  const { id, signal, version, build } = item as Record<string, unknown>;
  if (typeof id !== 'string' || !Object.hasOwn(STACK_LIBRARIES, id)) return null;
  const library = STACK_LIBRARIES[id as StackLibraryId];
  if (typeof signal !== 'string' || !Object.hasOwn(library.signals, signal)) return null;
  const known = STACK_BUILDS.find((b) => b === build);
  return { id: id as StackLibraryId, signal, version: cleanVersion(version), build: known ?? null };
}
