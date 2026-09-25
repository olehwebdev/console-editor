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
      /** Resolved map URL; null for an inline data: map or one loaded from a file (their sources resolve against the bundle URL). */
      mapUrl: string | null;
      map: SourceMapBody;
      /** The file's name, when the map is one loaded from a file (**Load a source map…**) rather than the bundle's own. */
      file?: string;
    };

/** A source map loaded from a file for a bundle (**Load a source map…**), kept with the workspace. */
export interface SourceMapFileInfo {
  bundleUrl: string;
  /** The file's name, as picked. */
  name: string;
  /** In bytes. */
  size: number;
  /** When it was loaded (ms since the epoch). */
  addedAt: number;
}
