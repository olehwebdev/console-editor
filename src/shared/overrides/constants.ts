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

/** How a new response override answers until told otherwise: 200, at once, with the upstream headers. */
export const DEFAULT_RESPONSE: Readonly<ResponseSettings> = { status: 200, delayMs: 0, headers: [] };

/** Where a GraphQL document names its operation: `query GetCart(…)`, `mutation ApplyCoupon`… */
export const OPERATION_IN_QUERY = /(?:^|[\s}])(?:query|mutation|subscription)\s+([_A-Za-z][_0-9A-Za-z]*)/;
