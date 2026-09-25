import type { ResourceKind } from './resources';

export type MatchType = 'exact' | 'glob' | 'regex';

/**
 * Decides which request URLs an override applies to.
 * - exact: the full URL (optionally ignoring the query string)
 * - glob:  `*` matches any run of characters, everything else is literal
 *          (use it for cache-busted names such as `main.*.js`)
 * - regex: a JavaScript regular expression tested against the full URL
 */
export interface UrlMatcher {
  type: MatchType;
  pattern: string;
  ignoreQuery: boolean;
}

export interface OverrideMeta {
  id: string;
  kind: ResourceKind;
  /** The URL the override was created from. Used for display and as the default match. */
  sourceUrl: string;
  match: UrlMatcher;
  enabled: boolean;
  /** sha256 of the upstream body when the override was created; used to detect upstream changes. */
  originalHash: string | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * An override as stored and served: metadata plus the edited content. The
 * content editing started from (the diff base) stays on disk until a diff
 * asks for it (`getOverrideBase`).
 */
export interface Override extends OverrideMeta {
  /** The edited content that is served instead of the upstream file. */
  content: string;
}

/** What `getOverride` returns. */
export type OverrideWithContent = Override;

export interface CreateOverrideInput {
  kind: ResourceKind;
  sourceUrl: string;
  content: string;
  /** What editing started from. Omit when identical to `content` (saves a multi-MB IPC transfer). */
  base?: string;
  originalHash: string | null;
  match?: UrlMatcher;
}

export interface OverridePatch {
  content?: string;
  match?: UrlMatcher;
  enabled?: boolean;
}
