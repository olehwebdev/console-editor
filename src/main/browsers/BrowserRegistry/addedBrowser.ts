import { OPEN_APP_FLAG, OPEN_COMMAND, APP_EXTENSION } from '../findBrowsers/mac/constants';
import type { AddedBrowser } from '../../store/BrowserStore';
import type { FoundBrowser } from '../types';

/** A browser the user added, as one found: its program started with the address (a macOS app through `open -a`). */
export function addedBrowser({ id, name, path, engine }: AddedBrowser): FoundBrowser {
  const macApp = process.platform === 'darwin' && path.endsWith(APP_EXTENSION);
  const command = macApp ? [OPEN_COMMAND, OPEN_APP_FLAG, path] : [path];
  return { id, name, engine, command, urlAt: command.length, iconFile: null, app: path, program: macApp ? null : path, added: true };
}
