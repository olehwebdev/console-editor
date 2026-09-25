import type { NetworkRequest, NetworkRequestDetail } from '@common/types';
import { REFERER_HEADER } from './constants';
import { settableHeader } from './settableHeader';

/**
 * A request as a fetch() call to paste in a console: its URL, method, the headers a page may set, its
 * body and referrer, with the page's cookies (`credentials: 'include'`) in place of its Cookie header.
 */
export function fetchSnippet(request: Pick<NetworkRequest, 'url' | 'method'>, detail: Pick<NetworkRequestDetail, 'requestHeaders' | 'body'>): string {
  const headers = Object.fromEntries(detail.requestHeaders.filter(settableHeader).map((h) => [h.name.toLowerCase(), h.value]));
  const referrer = detail.requestHeaders.find((h) => h.name.toLowerCase() === REFERER_HEADER)?.value;
  const init = {
    method: request.method,
    headers,
    ...(referrer ? { referrer } : {}),
    ...(detail.body !== undefined ? { body: detail.body } : {}),
    mode: 'cors',
    credentials: 'include',
  };
  return `fetch(${JSON.stringify(request.url)}, ${JSON.stringify(init, null, 2)});`;
}
