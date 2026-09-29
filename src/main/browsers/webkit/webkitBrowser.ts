import type { FoundBrowser } from '../types';
import { WEBKIT_ID, WEBKIT_NAME } from './constants';
import type { WebKitBuild } from './types';

/** The WebKit build as a browser: no command of its own (it opens only with the workspace's changes), its program. */
export function webkitBrowser(build: WebKitBuild): FoundBrowser {
  return { id: WEBKIT_ID, name: WEBKIT_NAME, engine: 'webkit', command: [], urlAt: 0, iconFile: null, app: null, program: build.executable, added: false };
}
