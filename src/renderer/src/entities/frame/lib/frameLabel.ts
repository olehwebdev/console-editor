import type { ConsoleFrame } from '@common/types';
import { hostOf, webAddress } from '@/shared/lib';
import { frameKey } from './frameKey';
import { givenName } from './givenName';

/**
 * What a frame is called: the name you gave it, else the iframe's `name`, else
 * where it is (the top page's host; an iframe's host and first folder, as in
 * `cart.example.com/embed`).
 */
export function frameLabel(frame: ConsoleFrame, names: Readonly<Record<string, string>>): string {
  const given = givenName(names, frameKey(frame));
  if (given) return given;
  if (frame.parentId && frame.name) return frame.name;
  if (!webAddress(frame.url)) return frame.parentId ? 'frame' : 'page';
  const host = hostOf(frame.url);
  if (!frame.parentId) return host;
  const [first] = new URL(frame.url).pathname.split('/').filter(Boolean);
  return first ? `${host}/${first}` : host;
}
