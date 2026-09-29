import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { protocol } from 'electron';
import { SHOT_SCHEME, SHOT_URL_HOST } from '../../shared/constants';
import type { ShotStore } from '../store/ShotStore';

/** Each kept image type's media type, by extension. */
const IMAGE_TYPES: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

/** Not found: a shot deleted since its URL was made, or a malformed one. */
const NOT_FOUND = 404;

/**
 * Serves captures and designs to the app's windows (`console-editor-shot://image/<id>`, `…//thumb/<id>`) from the
 * workspace folder, on the app's own session only: the website's session never has the scheme. A shot without a
 * thumbnail is served whole in its place.
 */
export function registerShotProtocol(store: ShotStore): void {
  protocol.handle(SHOT_SCHEME, async (request) => {
    try {
      const { host, pathname } = new URL(request.url);
      const { image, thumb } = store.paths(decodeURIComponent(pathname.slice(1)));
      const served = (path: string) => readFile(path).then((bytes) => ({ bytes, type: IMAGE_TYPES[extname(path)] }));
      const { bytes, type } = host === SHOT_URL_HOST.thumb ? await served(thumb).catch(() => served(image)) : await served(image);
      return new Response(bytes, { headers: { 'Content-Type': type ?? 'application/octet-stream', 'Cache-Control': 'no-cache' } });
    } catch {
      return new Response(null, { status: NOT_FOUND });
    }
  });
}
