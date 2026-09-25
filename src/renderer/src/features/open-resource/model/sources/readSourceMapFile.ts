import type { SourceMapFile } from '@common/types';
import { FILE_HANDLERS } from './fileHandlers';
import type { LoadResult } from './types';

/** Turns main's answer into a state. Generic so each status reaches its own handler without a cast. */
export function readSourceMapFile<S extends SourceMapFile['status']>(file: Extract<SourceMapFile, { status: S }>, bundleUrl: string): Promise<LoadResult> {
  return FILE_HANDLERS[file.status](file, bundleUrl);
}
