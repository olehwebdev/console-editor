import type { ResourceKind } from '../../../shared/types';
import { JS_MIME, OTHER_RESOURCE_TYPE, SCRIPT_KIND } from './constants';
import { isKind } from './isKind';

/**
 * The kind a response is listed as, if any. Workers load `importScripts` as
 * type `Other`, so on a worker's session a JavaScript response of that type is
 * a script; workers load no documents or stylesheets.
 */
export function listedKind(type: string | undefined, mimeType: string, onWorker: boolean): ResourceKind | undefined {
  if (!onWorker) return isKind(type) ? type : undefined;
  return type === SCRIPT_KIND || (type === OTHER_RESOURCE_TYPE && JS_MIME.test(mimeType)) ? SCRIPT_KIND : undefined;
}
