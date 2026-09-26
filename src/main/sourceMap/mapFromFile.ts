import type { ResourceContent, SourceMapFile } from '../../shared/types';
import { SOURCE_MAP_LIMITS } from './constants';

/**
 * A bundle's map loaded from a file (**Load a source map…**), handed over as a found map: the bundle is read
 * as the server sent it, and the map's sources resolve against the bundle's URL, as an inline map's do.
 */
export async function mapFromFile(bundleUrl: string, file: { name: string; bytes: Uint8Array }, content: (url: string) => Promise<ResourceContent>): Promise<SourceMapFile> {
  let bundle: ResourceContent;
  try {
    bundle = await content(bundleUrl);
  } catch (err) {
    return { status: 'failed', failure: 'unreadable', detail: err instanceof Error ? err.message : String(err), mapUrl: null };
  }
  return {
    status: 'found',
    bundleHash: bundle.hash,
    bundle: bundle.content.length <= SOURCE_MAP_LIMITS.maxBundleChars ? bundle.content : null,
    mapUrl: null,
    map: { type: 'bytes', bytes: file.bytes },
    file: file.name,
  };
}
