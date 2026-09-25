import type { SourceMapKind, SourceMapRequest } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { readSourceMapFile } from './readSourceMapFile';
import type { LoadResult } from './types';

/** Asks main for a bundle's map and has the worker read it. */
export async function fetchSourceMapState(bundleUrl: string, kind: SourceMapKind, known?: SourceMapRequest['known']): Promise<LoadResult> {
  try {
    return await readSourceMapFile(await api.getSourceMap({ bundleUrl, kind, ...(known ? { known } : {}) }), bundleUrl);
  } catch (err) {
    return { status: 'failed', failure: 'unreadable', detail: errorMessage(err), mapUrl: null };
  }
}
