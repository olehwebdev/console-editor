import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { startBrowser } from '../startBrowser';
import type { FoundBrowser } from '../types';
import { PORT_WAIT, START_URL } from './constants';
import { driveCommand } from './driveCommand';
import type { LaunchSpec } from './types';

/**
 * Starts a browser to be driven, its profile in `dir`, with `flags` (a debugging port among them) on a blank page;
 * resolves with the address it writes in its profile, once written. A file left there by an earlier run names a port
 * no longer listened on: it goes first.
 */
export async function launchDriven(browser: FoundBrowser, dir: string, { flags, portFile, read }: LaunchSpec): Promise<string> {
  await mkdir(dir, { recursive: true });
  await rm(join(dir, portFile), { force: true });
  const [program, ...args] = driveCommand(browser, flags, START_URL);
  await startBrowser({ command: [program, ...args], urlAt: args.length + 1 }, []);
  const deadline = Date.now() + PORT_WAIT.timeoutMs;
  for (;;) {
    const address = await read(dir);
    if (address) return address;
    if (Date.now() > deadline) throw new Error(`${browser.name} didn't open its debugging port`);
    await new Promise((resolve) => setTimeout(resolve, PORT_WAIT.stepMs));
  }
}
