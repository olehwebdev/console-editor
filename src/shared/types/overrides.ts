import type { ResourceKind } from './resources';
import type { HeaderEdit } from './rules';

/** The match types, in the order the UI offers them. */
export const MATCH_TYPES = ['exact', 'glob', 'regex'] as const;

export type MatchType = (typeof MATCH_TYPES)[number];

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

/** What a response override (kind `Fetch`) asks of a request besides its URL. */
export interface RequestMatch {
  /** An HTTP method in upper case, or `*` for any. A CORS preflight is never answered either way. */
  method: string;
  /** The GraphQL operation the request body must name ('' for any body): one `/graphql` URL serves many. */
  operation: string;
}

/** How a response override answers, besides its body. */
export interface ResponseSettings {
  /** The status the page gets, whatever upstream answered (100–599). */
  status: number;
  /** How long the answer is held back, to show the page's loading state (ms). */
  delayMs: number;
  /** Changes to the upstream headers, in order, as a header rule's (SPEC §6.3). */
  headers: HeaderEdit[];
}

export interface OverrideMeta {
  id: string;
  kind: ResourceKind;
  /** The URL the override was created from. Used for display and as the default match. */
  sourceUrl: string;
  match: UrlMatcher;
  enabled: boolean;
  /**
   * sha256 of the upstream body when the override was created; used to detect upstream changes.
   * Null for response overrides: API responses change on every call (ids, times).
   */
  originalHash: string | null;
  /** Response overrides only; the others match on the URL alone. */
  request?: RequestMatch;
  /** Response overrides only; the others answer 200 with the upstream headers. */
  response?: ResponseSettings;
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
  /** Response overrides (kind `Fetch`) only: defaults to the source's method, any body. */
  request?: RequestMatch;
  /** Response overrides only: defaults to 200, no delay, the upstream headers. */
  response?: ResponseSettings;
}

export interface OverridePatch {
  content?: string;
  match?: UrlMatcher;
  enabled?: boolean;
  /** Response overrides only. */
  request?: RequestMatch;
  /** Response overrides only. */
  response?: ResponseSettings;
}
