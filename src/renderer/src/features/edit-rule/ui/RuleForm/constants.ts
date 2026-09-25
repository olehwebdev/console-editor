import type { HeaderEdit, HeaderOperation } from '@common/types';
import type { HeaderOperationField } from './types';

/** Header names offered as the name field is typed in (any other name can be typed). */
export const COMMON_HEADER_NAMES: readonly string[] = [
  'Access-Control-Allow-Credentials',
  'Access-Control-Allow-Headers',
  'Access-Control-Allow-Methods',
  'Access-Control-Allow-Origin',
  'Access-Control-Expose-Headers',
  'Cache-Control',
  'Content-Disposition',
  'Content-Security-Policy',
  'Content-Security-Policy-Report-Only',
  'Content-Type',
  'Cross-Origin-Embedder-Policy',
  'Cross-Origin-Opener-Policy',
  'Cross-Origin-Resource-Policy',
  'Expires',
  'Permissions-Policy',
  'Pragma',
  'Referrer-Policy',
  'Strict-Transport-Security',
  'Timing-Allow-Origin',
  'Vary',
  'X-Content-Type-Options',
  'X-Frame-Options',
];

/** Lower-case names of the headers that steer caching: the browser's HTTP cache keeps the server's. */
export const CACHE_HEADER_NAMES: ReadonlySet<string> = new Set(['cache-control', 'expires', 'pragma']);

/** Lower-case names of a document's security headers: changing them re-serves the page. */
export const DOCUMENT_SECURITY_HEADER_NAMES: ReadonlySet<string> = new Set([
  'content-security-policy',
  'content-security-policy-report-only',
  'x-frame-options',
]);

/** Lower-case names of the header a CORS rule sets better. */
export const ALLOW_ORIGIN_HEADER_NAMES: ReadonlySet<string> = new Set(['access-control-allow-origin']);

/** How each header operation shows in a row. */
export const HEADER_OPERATION_FIELDS: Record<HeaderOperation, HeaderOperationField> = {
  set: { label: 'Set — replaces the header, or adds it', takesValue: true },
  remove: { label: 'Remove — drops the header', takesValue: false },
};

/** A row added with "Add header". */
export const BLANK_HEADER_EDIT: Readonly<HeaderEdit> = { operation: 'set', name: '', value: '' };
