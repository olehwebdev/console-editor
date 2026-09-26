import type { RequestMatch, ResourceKind, ResponseSettings } from '../types';

/** The kind of a response override: the only one with a request match and response settings. */
export const RESPONSE_KIND = 'Fetch' satisfies ResourceKind;

/**
 * GET: it carries no body (no GraphQL operation is looked for in it), and it is the only method sent
 * again to read a response live (reopening a tab, comparing): sending any other could change data.
 */
export const GET_METHOD = 'GET';

/** A request match's method that matches every method (a CORS preflight is still never answered). */
export const ANY_METHOD = '*';

/** What a response override made without one matches: any method, any body. */
export const DEFAULT_REQUEST: Readonly<RequestMatch> = { method: ANY_METHOD, operation: '' };

/** An HTTP method as a request match keeps it: upper case letters. */
export const METHOD = /^[A-Z]{1,16}$/;

/** A GraphQL operation name. */
export const OPERATION_NAME = /^[_A-Za-z][_0-9A-Za-z]{0,127}$/;

/** The statuses a response override may answer with (what Chromium's Fetch.fulfillRequest takes). */
export const MIN_STATUS = 100;
export const MAX_STATUS = 599;

/** The longest a response override holds its answer back. */
export const MAX_DELAY_MS = 60_000;

/** How a new response override answers until told otherwise: 200, at once, with the upstream headers, once the request was sent, with the saved text. */
export const DEFAULT_RESPONSE: Readonly<ResponseSettings> = { status: 200, delayMs: 0, headers: [], send: true, patch: false };

/** Where a GraphQL document names its operation: `query GetCart(…)`, `mutation ApplyCoupon`… */
export const OPERATION_IN_QUERY = /(?:^|[\s}])(?:query|mutation|subscription)\s+([_A-Za-z][_0-9A-Za-z]*)/;

/** What an export of overrides says it is (SPEC §5, Sharing), so an import can tell it from any other JSON. */
export const OVERRIDES_FILE_FORMAT = 'console-editor-overrides';

/** The version of the export written; an import refuses a newer one. */
export const OVERRIDES_FILE_VERSION = 1;

/** The most overrides one export may list. */
export const MAX_IMPORTED_OVERRIDES = 500;

/** A SHA-256 as the engine writes it: what an override's `originalHash` holds. */
export const SHA256_HEX = /^[0-9a-f]{64}$/;

/** The URLs an override is made from: web addresses. */
export const SOURCE_URL = /^https?:\/\//i;
