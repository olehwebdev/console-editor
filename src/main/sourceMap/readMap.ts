import type { SourceMapFile } from '../../shared/types';
import { MAP_READERS, type MapReadContext } from './mapReaders';
import type { ResolvedMapUrl } from './types';

/** Reads a map from wherever its reference resolved to. Generic so each kind reaches its own reader without a cast. */
export function readMap<T extends ResolvedMapUrl['type']>(resolved: Extract<ResolvedMapUrl, { type: T }>, context: MapReadContext): Promise<SourceMapFile> {
  return MAP_READERS[resolved.type](resolved, context);
}
