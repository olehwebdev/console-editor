import type { RuleAction, RuleResourceType } from '../../../shared/types';
import type { RuleActionSpec } from './types';

/**
 * Where each action runs. Blocking answers the Request stage, before anything
 * is sent; header and CORS rules edit a response's head. CORS never applies to
 * documents: navigations aren't subject to it. A new action fails typecheck
 * until it has an entry.
 */
export const RULE_ACTION_SPECS = {
  block: { stage: 'Request', documents: true },
  headers: { stage: 'Response', documents: true },
  cors: { stage: 'Response', documents: false },
} as const satisfies Record<RuleAction, RuleActionSpec>;

/**
 * CDP resource types a rule's type filter knows under another name. fetch() and CORS preflights pause
 * as XHR in the builds probed, and <link rel=prefetch> as Fetch; the other names cover builds that
 * report them as Network does.
 */
export const RESOURCE_TYPE_ALIASES: Readonly<Record<string, RuleResourceType>> = {
  Fetch: 'XHR',
  Preflight: 'XHR',
  Prefetch: 'XHR',
  EventSource: 'XHR',
  TextTrack: 'Media',
};

/** The type filter's name for every request type it doesn't list. */
export const OTHER_RULE_TYPE = 'Other' satisfies RuleResourceType;

/** The CORS response headers, as a CORS rule writes them. */
export const ALLOW_ORIGIN_HEADER = 'Access-Control-Allow-Origin';
export const ALLOW_CREDENTIALS_HEADER = 'Access-Control-Allow-Credentials';
export const ALLOW_METHODS_HEADER = 'Access-Control-Allow-Methods';
export const ALLOW_HEADERS_HEADER = 'Access-Control-Allow-Headers';
export const MAX_AGE_HEADER = 'Access-Control-Max-Age';
export const EXPOSE_HEADERS_HEADER = 'Access-Control-Expose-Headers';

/** Every CORS response header by lower-case name: a CORS rule replaces upstream's. */
export const CORS_RESPONSE_HEADERS: ReadonlySet<string> = new Set(
  [ALLOW_ORIGIN_HEADER, ALLOW_CREDENTIALS_HEADER, ALLOW_METHODS_HEADER, ALLOW_HEADERS_HEADER, MAX_AGE_HEADER, EXPOSE_HEADERS_HEADER].map(
    (name) => name.toLowerCase(),
  ),
);

/** Request headers a CORS rule reads, by their lower-case names. */
export const ORIGIN_REQUEST_HEADER = 'origin';
export const REQUEST_METHOD_HEADER = 'access-control-request-method';
export const REQUEST_HEADERS_HEADER = 'access-control-request-headers';

/** A CORS preflight's method. */
export const OPTIONS_METHOD = 'OPTIONS';

/** What a preflight upstream refused is answered with instead (a preflight must succeed). */
export const PREFLIGHT_STATUS = 204;

/** How long a browser may cache a preflight answered by a rule: not at all, so turning the rule off takes effect at once. */
export const PREFLIGHT_MAX_AGE = '0';

/** Allow-Origin when the requesting origin is unknown; credentialed requests then still fail. */
export const ANY_ORIGIN = '*';

/** Allow-Credentials' only value. */
export const ALLOW_CREDENTIALS = 'true';

/** Joins the names in Expose-Headers. */
export const HEADER_LIST_SEPARATOR = ', ';

/** Response headers a page may always read, by lower-case name: never listed in Expose-Headers. */
export const CORS_SAFELISTED_RESPONSE_HEADERS: ReadonlySet<string> = new Set([
  'cache-control',
  'content-language',
  'content-length',
  'content-type',
  'expires',
  'last-modified',
  'pragma',
]);

/** Headers a page can never read, by lower-case name: never listed in Expose-Headers. */
export const COOKIE_HEADERS: ReadonlySet<string> = new Set(['set-cookie', 'set-cookie2']);
