import type { ResourceKind } from './resources';

/** Resource kinds whose files can name a source map (a document's inline scripts are out of scope). */
export type SourceMapKind = Extract<ResourceKind, 'Script' | 'Stylesheet'>;

export const SOURCE_MAP_KINDS: readonly SourceMapKind[] = ['Script', 'Stylesheet'];

/** Asks main for a bundle's source map (on a user action only). */
export interface SourceMapRequest {
  /** A listed script's or stylesheet's URL (its final response URL): http(s) only. */
  bundleUrl: string;
  kind: SourceMapKind;
  /** What the renderer holds: answered `unchanged` (nothing fetched or sent) while both still match. */
  known?: { bundleHash: string; mapUrl: string | null };
}

/** The map as main hands it over. Main never decodes or parses it: the renderer's source-map worker does. */
export type SourceMapBody = { type: 'bytes'; bytes: Uint8Array } | { type: 'inline'; dataUrl: string };

/**
 * Why main could not hand over a map. `detail`: unreadable/network → the error message; bad-url → the
 * reference (shortened); scheme → the protocol ('file:'); http → the status ('404'); timeout → seconds;
 * too-large → megabytes.
 */
export type SourceMapFetchFailure = 'unreadable' | 'bad-url' | 'scheme' | 'http' | 'network' | 'timeout' | 'too-large';

export type SourceMapFile =
  | { status: 'unchanged' }
  | { status: 'none'; bundleHash: string }
  | { status: 'failed'; failure: SourceMapFetchFailure; detail: string; mapUrl: string | null }
  | {
      status: 'found';
      bundleHash: string;
      /** The bundle text the map describes (upstream, even when an override serves it); null when too large to line up. */
      bundle: string | null;
      /** Resolved map URL; null for an inline data: map (its sources resolve against the bundle URL). */
      mapUrl: string | null;
      map: SourceMapBody;
    };
