import { CONTENT_TYPE, HTML_MIME_TYPE } from '../constants';
import { headerValue, isRedirect } from '../transform';
import { DOCUMENT_KIND } from './constants';
import { hasResponseHead } from './hasResponseHead';
import type { PausedResponse, RequestPausedParams } from './types';

/** Part of every HTML content type; a document whose type lacks it isn't rewritten. */
const HTML_TYPE_MARKER = 'html';

/** An HTML document with a whole, non-redirect response: never a navigated PDF or a download. */
export function isHtmlDocument(p: RequestPausedParams): p is PausedResponse {
  return (
    p.resourceType === DOCUMENT_KIND &&
    hasResponseHead(p) &&
    !isRedirect(p.responseStatusCode, p.responseHeaders) &&
    (headerValue(p.responseHeaders, CONTENT_TYPE) ?? HTML_MIME_TYPE).includes(HTML_TYPE_MARKER)
  );
}
