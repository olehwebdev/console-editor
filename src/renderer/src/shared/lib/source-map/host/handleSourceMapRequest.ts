import type { SourceMapRequestOf, SourceMapRequestType, SourceMapWorkerReplies } from '../types';
import { SOURCE_MAP_HANDLERS } from './sourceMapHandlers';
import type { LoadedMaps } from './types';

/** Answers one request against the maps the worker holds. Generic so each type reaches its own handler without a cast. */
export function handleSourceMapRequest<T extends SourceMapRequestType>(maps: LoadedMaps, request: SourceMapRequestOf<T>): SourceMapWorkerReplies[T] {
  return SOURCE_MAP_HANDLERS[request.type](maps, request);
}
