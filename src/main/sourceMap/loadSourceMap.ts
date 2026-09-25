import type { ResourceContent, SourceMapFile, SourceMapRequest } from '../../shared/types';
import { SOURCE_MAP_LIMITS } from './constants';
import { MAP_COMMENT_FINDERS } from './mapCommentFinders';
import { pickMapReference } from './pickMapReference';
import { readMap } from './readMap';
import { resolveMapUrl } from './resolveMapUrl';
import type { SourceMapDeps, SourceMapLimits } from './types';

/**
 * Finds a script's or stylesheet's source map and hands it over unparsed (the renderer's worker
 * parses it). The bundle is read as the server sent it, so a file served from an override is mapped
 * as built. Answers `unchanged`, fetching and sending nothing, while the bundle and map the renderer
 * already holds still match.
 */
export async function loadSourceMap(request: SourceMapRequest, deps: SourceMapDeps, limits: SourceMapLimits = SOURCE_MAP_LIMITS): Promise<SourceMapFile> {
  let content: ResourceContent;
  try {
    content = await deps.content(request.bundleUrl);
  } catch (err) {
    return { status: 'failed', failure: 'unreadable', detail: err instanceof Error ? err.message : String(err), mapUrl: null };
  }
  const reference = pickMapReference(request.kind, content.sourceMap, MAP_COMMENT_FINDERS[request.kind](content.content));
  if (!reference) return { status: 'none', bundleHash: content.hash };
  const resolved = resolveMapUrl(reference.value, request.bundleUrl, limits);
  const mapUrl = resolved.type === 'remote' ? resolved.url : null;
  const { known } = request;
  if (resolved.type !== 'failed' && known?.bundleHash === content.hash && known.mapUrl === mapUrl) return { status: 'unchanged' };
  const bundle = content.content.length <= limits.maxBundleChars ? content.content : null;
  return readMap(resolved, {
    bundleUrl: request.bundleUrl,
    deps,
    limits,
    found: (url, map) => ({ status: 'found', bundleHash: content.hash, bundle, mapUrl: url, map }),
  });
}
