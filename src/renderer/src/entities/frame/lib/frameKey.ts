import type { ConsoleFrame } from '@common/types';
import { webAddress } from '@/shared/lib';
import { ID_KEY_PREFIX, NAME_KEY_PREFIX, TOP_FRAME_KEY } from './constants';

/**
 * What stays the same when a frame reloads (its id may not): the top page is
 * always the top, an iframe is its document's address, or its `name` when it
 * has none. Names, colours, filters and the picked frame all follow it.
 */
export function frameKey(frame: Pick<ConsoleFrame, 'id' | 'parentId' | 'url' | 'name'>): string {
  if (!frame.parentId) return TOP_FRAME_KEY;
  const address = webAddress(frame.url);
  if (address) return address;
  return frame.name ? `${NAME_KEY_PREFIX}${frame.name}` : `${ID_KEY_PREFIX}${frame.id}`;
}
