import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { LOCAL_NETWORK_ACCESS_FEATURES } from '../../chromiumFlags';
import { startBrowser } from '../startBrowser';
import type { FoundBrowser } from '../types';
import { ACTIVE_PORT_FILE, ACTIVE_PORT_WAIT, DISABLE_FEATURES_FLAG, DRIVE_FLAGS, START_URL, USER_DATA_FLAG } from './constants';
import { driveCommand } from './driveCommand';
import { readActivePort } from './readActivePort';

/**
 * Starts a Chromium browser to be driven: with its profile in `dir`, a debugging port, the app's Chromium switches, on
 * a blank page; resolves with its WebSocket address once it has written it.
 */
export async function launchForDriving(browser: FoundBrowser, dir: string): Promise<string> {
  await mkdir(dir, { recursive: true });
  // A file left by an earlier run names a port no longer listened on.
  await rm(join(dir, ACTIVE_PORT_FILE), { force: true });
  const flags = [`${USER_DATA_FLAG}${dir}`, ...DRIVE_FLAGS, `${DISABLE_FEATURES_FLAG}${LOCAL_NETWORK_ACCESS_FEATURES.join(',')}`];
  const [program, ...args] = driveCommand(browser, flags, START_URL);
  await startBrowser({ command: [program, ...args], urlAt: args.length + 1 }, []);
  const deadline = Date.now() + ACTIVE_PORT_WAIT.timeoutMs;
  for (;;) {
    const address = await readActivePort(dir);
    if (address) return address;
    if (Date.now() > deadline) throw new Error(`${browser.name} didn't open its debugging port`);
    await new Promise((resolve) => setTimeout(resolve, ACTIVE_PORT_WAIT.stepMs));
  }
}
