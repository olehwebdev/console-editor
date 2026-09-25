import { VERSION_PATTERN } from './constants';

/** A version as a page reported it, if it looks like one: anything else is dropped rather than shown. */
export function cleanVersion(version: unknown): string | null {
  if (typeof version !== 'string') return null;
  const trimmed = version.trim();
  return VERSION_PATTERN.test(trimmed) ? trimmed : null;
}
