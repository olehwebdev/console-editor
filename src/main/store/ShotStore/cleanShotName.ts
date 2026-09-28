import { MAX_SHOT_NAME, UNSAFE_NAME_CHARS } from './constants';

/** A name fit for a shot's file: without path separators, characters file systems refuse, or surrounding spaces. Null when nothing is left. */
export function cleanShotName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const clean = name.replace(UNSAFE_NAME_CHARS, '-').trim().slice(0, MAX_SHOT_NAME).trim();
  return clean && clean !== '.' && clean !== '..' ? clean : null;
}
