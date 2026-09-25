import type { ResourceRow } from '@/entities/resource';
import type { IsOpen, SourceMapState, SourceRow } from '@/entities/source-map';

/** What a script or stylesheet row knows of its map. */
export interface BundleNest {
  /** `unknown`: not asked for yet, or no longer held. */
  status: SourceMapState['status'] | 'unknown';
  /** How many originals the map lists, once read. */
  count: number | null;
  /** Why the map couldn't be read, in words. */
  failure: string | null;
  mapUrl: string | null;
}

/** A file row; scripts and stylesheets that may have a map open onto their originals. */
export type ExplorerFileRow = Extract<ResourceRow, { type: 'file' }> & {
  /** Whether its nest of originals is open; undefined when it has none to open. */
  expanded?: boolean;
  /** Null for documents, and for files known to have no map. */
  nest: BundleNest | null;
};

/** Every row the Explorer's tree shows: the page's files, and the originals nested under bundles. */
export type ExplorerRow = Exclude<ResourceRow, { type: 'file' }> | ExplorerFileRow | SourceRow;
export type ExplorerRowType = ExplorerRow['type'];
/** The row of type `T`. */
export type ExplorerRowOf<T extends ExplorerRowType> = Extract<ExplorerRow, { type: T }>;

export interface SourceRowsInput {
  byBundle: Record<string, SourceMapState>;
  isOpen: IsOpen;
  /** The filter, trimmed. */
  query: string;
  /** Bundles with originals that match the filter: listed, and open. */
  matching: ReadonlySet<string>;
}
