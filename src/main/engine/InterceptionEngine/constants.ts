import { CDP_WILDCARD } from '../../../shared/matcher';
import { RESPONSE_KIND } from '../../../shared/overrides';
import type { BreakpointStage, ResourceKind } from '../../../shared/types';
import type { FetchPattern, RequestStage } from './types';

/** The kind, and CDP resource type, of HTML documents: only document overrides answer them, and SRI is stripped from them. */
export const DOCUMENT_KIND = 'Document' satisfies ResourceKind;

/** The kind, and CDP resource type, of scripts. */
export const SCRIPT_KIND = 'Script' satisfies ResourceKind;

/** The kind of a response override: what fetch() and XMLHttpRequest get. */
export const FETCH_KIND = RESPONSE_KIND;

/**
 * The CDP resource type Fetch pauses fetch() and XHR requests as (probed in Chromium 141 and 152: both
 * are `XHR`, and a pattern for `Fetch` pauses nothing in 141).
 */
export const XHR_RESOURCE_TYPE = 'XHR';

/** The resource types a response override answers: `Fetch` too, for a Chromium that reports it. */
export const FETCH_RESOURCE_TYPES: ReadonlySet<string> = new Set([XHR_RESOURCE_TYPE, FETCH_KIND]);

/**
 * The CDP resource type of requests that fit no other. Workers load scripts
 * as it: a worker's first script, a module worker's static imports, and (as
 * their sessions report it) `importScripts`.
 */
export const OTHER_RESOURCE_TYPE = 'Other';

/** A CDP URL pattern matching every request (all `toCdpUrlPattern` can offer a regex). */
export const ANY_URL = CDP_WILDCARD;

/** URLs never listed: they name no file that could be overridden. */
export const UNLISTED_URL = /^(data|blob|about|chrome|devtools):/;

/** An override answers with a success, whatever upstream said. */
export const OVERRIDE_STATUS = 200;

/** The status a worker's first script is listed with when no response gave one: it started, so it loaded. */
export const STARTED_SCRIPT_STATUS = 200;

/** JavaScript MIME types (what `importScripts` in a worker gets). */
export const JS_MIME = /^(text|application)\/(x-)?(javascript|ecmascript)|^text\/jscript/i;

/** Joins an override or rule id and a URL into the key a miss is reported once by. */
export const MISSED_KEY_SEPARATOR = '|';

/** Joins an override's id and save time into the version a service worker's script was served. */
export const VERSION_SEPARATOR = '@';

/** How much response data Chromium keeps for `Network.getResponseBody`, in all and per response. */
const MAX_TOTAL_BUFFER_BYTES = 256 * 1024 * 1024;
const MAX_RESOURCE_BUFFER_BYTES = 64 * 1024 * 1024;
/** `Network.enable`'s params on every session: buffers large enough to return big bundles. */
export const NETWORK_BUFFERS = { maxTotalBufferSize: MAX_TOTAL_BUFFER_BYTES, maxResourceBufferSize: MAX_RESOURCE_BUFFER_BYTES };

/** The CDP resource types workers load scripts as. */
export const WORKER_SCRIPT_TYPES: ReadonlySet<string> = new Set([SCRIPT_KIND, OTHER_RESOURCE_TYPE]);

/** Every script a worker whose session `pausesScripts` loads (see `WorkerSession`). */
export const WORKER_SCRIPT_PATTERNS: readonly FetchPattern[] = [
  { urlPattern: ANY_URL, resourceType: SCRIPT_KIND, requestStage: 'Response' },
  { urlPattern: ANY_URL, resourceType: OTHER_RESOURCE_TYPE, requestStage: 'Response' },
];

/** The status a blocked request is listed with: the page got no response at all. */
export const BLOCKED_STATUS = 0;

/** The `Fetch` stage each breakpoint stage pauses at. */
export const BREAKPOINT_PAUSE_STAGE: Record<BreakpointStage, RequestStage> = { request: 'Request', response: 'Response' };

/** Response types a held response's body is shown as text for (a JSON API's, most often). */
export const TEXT_BODY = /^text\/|json|xml|javascript|graphql|x-www-form-urlencoded/i;
