import { loadMap } from './loadMap';
import { readSource } from './readSource';
import { toBundle } from './toBundle';
import { toOriginal } from './toOriginal';
import { toView } from './toView';
import type { SourceMapHandlers } from './types';

/** What the worker does for each request: a new request type fails typecheck until it's handled. */
export const SOURCE_MAP_HANDLERS: SourceMapHandlers = {
  load: loadMap,
  content: readSource,
  toOriginal,
  toBundle,
  toView,
};
