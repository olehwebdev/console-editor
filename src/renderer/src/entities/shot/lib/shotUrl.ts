import { SHOT_SCHEME, SHOT_URL_HOST } from '@common/constants';
import type { Shot } from '@common/types';

/** Where the app's windows load a shot's image or thumbnail; its last change in the query, so an edit shows. */
export function shotUrl(shot: Pick<Shot, 'id' | 'updatedAt'>, what: keyof typeof SHOT_URL_HOST = 'image'): string {
  return `${SHOT_SCHEME}://${SHOT_URL_HOST[what]}/${encodeURIComponent(shot.id)}?v=${shot.updatedAt}`;
}
