import type { SourceMapKind } from '../../shared/types';
import { findScriptMapComment } from './findScriptMapComment';
import { findStyleMapComment } from './findStyleMapComment';
import type { MapCommentFinder } from './types';

/** How each kind of file names its map in a comment: a new kind fails typecheck until it has one. */
export const MAP_COMMENT_FINDERS: Record<SourceMapKind, MapCommentFinder> = {
  Script: findScriptMapComment,
  Stylesheet: findStyleMapComment,
};
