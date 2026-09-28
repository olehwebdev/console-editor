import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FoundBrowser } from '../../types';
import { launchDriven } from '../launchDriven';
import { BIDI_PORT_FILE, FIREFOX_FLAGS, FIREFOX_PREFS, PROFILE_FLAG, USER_PREFS_FILE } from './constants';
import { readBidiPort } from './readBidiPort';

/** Starts Firefox to be driven: its profile in `dir` (with the app's preferences), and a WebDriver BiDi port. */
export async function launchFirefox(browser: FoundBrowser, dir: string): Promise<string> {
  await mkdir(dir, { recursive: true });
  const prefs = FIREFOX_PREFS.map(([name, value]) => `user_pref(${JSON.stringify(name)}, ${JSON.stringify(value)});`);
  await writeFile(join(dir, USER_PREFS_FILE), `${prefs.join('\n')}\n`);
  return launchDriven(browser, dir, { flags: [PROFILE_FLAG, dir, ...FIREFOX_FLAGS], portFile: BIDI_PORT_FILE, read: readBidiPort });
}
