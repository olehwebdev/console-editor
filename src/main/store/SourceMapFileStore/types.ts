import type { SourceMapFileInfo } from '../../../shared/types';

/** A map loaded from a file, as the index keeps it: whose it is, and the copy's file name in the folder. */
export interface StoredMapFile extends SourceMapFileInfo {
  workspaceId: string;
  file: string;
}
