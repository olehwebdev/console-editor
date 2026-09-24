import type { Override, Settings } from '../../../shared/types';
import { stripIntegrityAttributes, stripSourceMapComments } from '../transform';
import { DOCUMENT_KIND } from './constants';

/**
 * What an override serves: its content, without SRI attributes (a document)
 * or source map comments (a script or stylesheet) when the settings say so.
 */
export function overrideBody(override: Override, settings: Settings): string {
  let body = override.content;
  if (override.kind === DOCUMENT_KIND) {
    if (settings.stripIntegrity) body = stripIntegrityAttributes(body).html;
  } else if (settings.stripSourceMaps) {
    body = stripSourceMapComments(body);
  }
  return body;
}
