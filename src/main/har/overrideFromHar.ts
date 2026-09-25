import { defaultMatcherFor } from '../../shared/matcher';
import { GET_METHOD, graphqlOperation, METHOD, RESPONSE_KIND, validateResponseSettings } from '../../shared/overrides';
import type { CreateOverrideInput } from '../../shared/types';
import { HTTP_URL } from '../constants';
import { TEXT_MIME } from '../network/constants';
import { BASE64_ENCODING, IMPORTED_RESOURCE_TYPES } from './constants';
import type { HarEntry } from './types';

/** A JSON media type: answered with the override's own JSON type, needing no header change. */
const JSON_MIME = /[/+]json\b/i;

/**
 * The response override that answers a HAR entry's request as it was answered, without sending it: its
 * URL (with its query, when it had one), method and GraphQL operation, its status and text body. Null
 * for what isn't a fetch() or XHR the page's code made, or has no text body to answer with.
 */
export function overrideFromHar(value: unknown): CreateOverrideInput | null {
  const entry = value as Partial<HarEntry> | null;
  const { request, response } = entry ?? {};
  const url = request?.url;
  const method = typeof request?.method === 'string' ? request.method.toUpperCase() : '';
  if (typeof url !== 'string' || !HTTP_URL.test(url) || !URL.canParse(url) || !METHOD.test(method)) return null;
  const type = entry?._resourceType;
  const mime = typeof response?.content?.mimeType === 'string' ? response.content.mimeType : '';
  if (typeof type === 'string' ? !IMPORTED_RESOURCE_TYPES.has(type) : !TEXT_MIME.test(mime)) return null;
  const raw = response?.content?.text;
  if (typeof raw !== 'string') return null;
  const text = response?.content?.encoding === BASE64_ENCODING ? Buffer.from(raw, 'base64').toString('utf8') : raw;
  const settings = { status: Number(response?.status), delayMs: 0, headers: mime && !JSON_MIME.test(mime) ? [{ operation: 'set' as const, name: 'Content-Type', value: mime }] : [], send: false, patch: false };
  if (validateResponseSettings(settings)) return null;
  const operation = method === GET_METHOD ? undefined : graphqlOperation(request?.postData?.text);
  return {
    kind: RESPONSE_KIND,
    sourceUrl: url,
    content: text,
    originalHash: null,
    match: new URL(url).search ? { type: 'exact', pattern: url, ignoreQuery: false } : defaultMatcherFor(url),
    request: { method, operation: operation ?? '' },
    response: settings,
  };
}
