import type { SourceMapFile } from '@common/types';
import type { SourceMapState } from '@/entities/source-map';
import type { UNCHANGED } from './constants';

/** What a load comes to: a state to store, or that the map held is still right. */
export type LoadResult = SourceMapState | typeof UNCHANGED;

export type FileHandlers = {
  [S in SourceMapFile['status']]: (file: Extract<SourceMapFile, { status: S }>, bundleUrl: string) => Promise<LoadResult>;
};

/** What a toast about a jump names. */
export interface MissContext {
  bundle: string;
  file?: string;
  line?: number;
  /** Why code has no original or a jump landed short: the user's edits, or a new build of the file. */
  cause?: 'yours' | 'changed';
}
