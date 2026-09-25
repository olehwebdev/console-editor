import type { Override, ResourceKind, Settings } from '../../../shared/types';
import { stripIntegrityAttributes, stripSourceMapComments } from '../transform';

/** What each kind's served body goes through: a new kind fails typecheck until it has an entry. */
const BODY_TRANSFORMS: Record<ResourceKind, (content: string, settings: Settings) => string> = {
  Document: (content, settings) => (settings.stripIntegrity ? stripIntegrityAttributes(content).html : content),
  Script: (content, settings) => (settings.stripSourceMaps ? stripSourceMapComments(content) : content),
  Stylesheet: (content, settings) => (settings.stripSourceMaps ? stripSourceMapComments(content) : content),
  // A response is served exactly as typed.
  Fetch: (content) => content,
};

/**
 * What an override serves: its content, without SRI attributes (a document)
 * or source map comments (a script or stylesheet) when the settings say so.
 */
export function overrideBody(override: Override, settings: Settings): string {
  return BODY_TRANSFORMS[override.kind](override.content, settings);
}
