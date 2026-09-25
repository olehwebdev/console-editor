import { NAME_KEY_PREFIX, TOP_FRAME_KEY } from './constants';
import { frameLabel } from './frameLabel';
import { givenName } from './givenName';

/**
 * What a frame reads as while the page has none with its key: the name you
 * gave it, else its `name` attribute (`name`), else what its key says: the top
 * page, or where it is.
 */
export function keyLabel(key: string, names: Readonly<Record<string, string>>, name = ''): string {
  const given = givenName(names, key);
  if (given) return given;
  if (key === TOP_FRAME_KEY) return 'page';
  if (name) return name;
  if (key.startsWith(NAME_KEY_PREFIX)) return key.slice(NAME_KEY_PREFIX.length);
  // An iframe at that address (an `id:` key has none): its host and first folder.
  return frameLabel({ id: key, parentId: TOP_FRAME_KEY, url: key, name: '', canRun: false }, {});
}
