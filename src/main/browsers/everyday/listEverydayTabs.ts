import { homedir } from 'node:os';
import type { EverydayBrowser } from '../../../shared/types';
import { runProgram } from '../runProgram';
import type { FoundBrowser } from '../types';
import { listFirefoxTabs } from './listFirefoxTabs';
import { listScriptableTabs, SCRIPTING_PLATFORM } from './scriptable';

/**
 * The tabs open in your everyday browsers, read when asked and here only: Firefox's from its session files, and on
 * macOS, those of the running browsers among `browsers` that scripting reaches (Safari, Chrome, Edge, Brave, Arc…).
 */
export async function listEverydayTabs(browsers: readonly FoundBrowser[], home = homedir(), platform: NodeJS.Platform = process.platform, run = runProgram): Promise<EverydayBrowser[]> {
  const [firefox, scripted] = await Promise.all([listFirefoxTabs(home, platform), platform === SCRIPTING_PLATFORM ? listScriptableTabs(browsers, run) : []]);
  return [...firefox, ...scripted];
}
