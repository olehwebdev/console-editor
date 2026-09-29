import { access } from 'node:fs/promises';
import type { FoundBrowser } from '../../types';
import type { Driver, DriverDeps } from '../types';
import { connectPlaywright } from './connectPlaywright';

/** Drives the WebKit build the app downloaded (Playwright's) in a window of its own; it has to be downloaded first. */
export async function connectWebKit(browser: FoundBrowser, deps: DriverDeps): Promise<Driver> {
  const program = browser.program;
  const downloaded = program ? await access(program).then(() => true, () => false) : false;
  if (!program || !downloaded) throw new Error('Download WebKit first');
  const { webkit } = await import('playwright-core');
  return connectPlaywright({ type: webkit, executablePath: program, headless: false }, browser, deps);
}
