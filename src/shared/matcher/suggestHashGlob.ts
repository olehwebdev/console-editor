import { GLOB_WILDCARD } from './constants';
import { looksLikeHash } from './looksLikeHash';
import { stripQuery } from './stripQuery';

/**
 * Suggests a glob for cache-busted file names, e.g.
 * `https://cdn.x.com/js/main.3f9a1c2b.js` -> `https://cdn.x.com/js/main.*.js`.
 * Returns null when the URL has no hash-like segment.
 */
export function suggestHashGlob(url: string): string | null {
  const base = stripQuery(url);
  const slash = base.lastIndexOf('/');
  const parts = base.slice(slash + 1).split('.');
  if (parts.length < 2) return null;
  let changed = false;
  // `main.3f9a1c2b.js`, `main.3f9a1c2b.chunk.js` (never the name or the extension)
  for (let i = 1; i < parts.length - 1; i++) {
    if (looksLikeHash(parts[i])) {
      parts[i] = GLOB_WILDCARD;
      changed = true;
    }
  }
  // `index-BkT3x9aQ.js` (Vite / Rollup `[name]-[hash]`)
  if (!changed) {
    const m = /^(.*[-_])([0-9A-Za-z]{8,})$/.exec(parts[0]);
    if (m && looksLikeHash(m[2])) {
      parts[0] = `${m[1]}${GLOB_WILDCARD}`;
      changed = true;
    }
  }
  return changed ? base.slice(0, slash + 1) + parts.join('.') : null;
}
