import type { UrlMatcher } from './types';

export type UrlPredicate = (url: string) => boolean;

/** Removes the query string and fragment from a URL. */
export function stripQuery(url: string): string {
  const i = url.search(/[?#]/);
  return i === -1 ? url : url.slice(0, i);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/** `*` matches any run of characters; everything else is literal. */
export function globToRegExp(glob: string): RegExp {
  return new RegExp(`^${glob.split('*').map(escapeRegExp).join('.*')}$`);
}

/** Returns a human readable error, or null when the matcher is usable. */
export function validateMatcher(matcher: UrlMatcher): string | null {
  if (!matcher.pattern.trim()) return 'Pattern is empty';
  if (matcher.type === 'regex') {
    try {
      new RegExp(matcher.pattern);
    } catch (err) {
      return `Invalid regular expression: ${(err as Error).message}`;
    }
  }
  return null;
}

export function compileMatcher(matcher: UrlMatcher): UrlPredicate {
  const normalize = matcher.ignoreQuery ? stripQuery : (url: string) => url;
  switch (matcher.type) {
    case 'exact': {
      const target = normalize(matcher.pattern);
      return (url) => normalize(url) === target;
    }
    case 'glob': {
      const re = globToRegExp(normalize(matcher.pattern));
      return (url) => re.test(normalize(url));
    }
    case 'regex': {
      if (validateMatcher(matcher)) return () => false;
      const re = new RegExp(matcher.pattern);
      return (url) => re.test(normalize(url));
    }
  }
}

/** Escapes a literal for a CDP Fetch url pattern (`*` and `?` are wildcards, `\` escapes). */
function escapeCdp(text: string): string {
  return text.replace(/[\\*?]/g, '\\$&');
}

/**
 * Converts a matcher into a CDP `Fetch.RequestPattern.urlPattern`.
 * The result may match more URLs than the matcher (it is only a pre-filter
 * that decides which requests get paused); the matcher makes the final call.
 */
export function toCdpUrlPattern(matcher: UrlMatcher): string {
  const suffix = matcher.ignoreQuery ? '*' : '';
  switch (matcher.type) {
    case 'exact':
      return escapeCdp(matcher.ignoreQuery ? stripQuery(matcher.pattern) : matcher.pattern) + suffix;
    case 'glob': {
      const base = matcher.ignoreQuery ? stripQuery(matcher.pattern) : matcher.pattern;
      return base.split('*').map(escapeCdp).join('*') + suffix;
    }
    case 'regex':
      return '*';
  }
}

/** The default matcher for an override created from `url`. */
export function defaultMatcherFor(url: string): UrlMatcher {
  return { type: 'exact', pattern: stripQuery(url), ignoreQuery: true };
}

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
      parts[i] = '*';
      changed = true;
    }
  }
  // `index-BkT3x9aQ.js` (Vite / Rollup `[name]-[hash]`)
  if (!changed) {
    const m = /^(.*[-_])([0-9A-Za-z]{8,})$/.exec(parts[0]);
    if (m && looksLikeHash(m[2])) {
      parts[0] = `${m[1]}*`;
      changed = true;
    }
  }
  return changed ? base.slice(0, slash + 1) + parts.join('.') : null;
}

function looksLikeHash(segment: string): boolean {
  if (/^[0-9a-f]{8,}$/.test(segment)) return true;
  return segment.length >= 6 && /^[0-9A-Za-z_-]+$/.test(segment) && /\d/.test(segment) && /[A-Za-z]/.test(segment);
}
