import { DEFAULT_SETTINGS, type Settings } from '../../shared/types';

/** Keeps only known boolean settings, so a corrupt or old file can't inject junk. */
export function pickKnown(input: Partial<Settings>): Partial<Settings> {
  const out: Partial<Settings> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS) as Array<keyof Settings>) {
    if (typeof input[key] === 'boolean') out[key] = input[key];
  }
  return out;
}
