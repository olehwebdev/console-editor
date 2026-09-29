import type { EverydayBrowser } from '../../../../shared/types';
import { runProgram } from '../../runProgram';
import type { FoundBrowser } from '../../types';
import { JXA_FLAGS, OSASCRIPT, SCRIPT_TIMEOUT_MS } from './constants';
import { scriptableApp } from './scriptableApp';
import { scriptTabsOf } from './scriptTabsOf';
import { tabsScript } from './tabsScript';

/**
 * The tabs open in the macOS browsers scripting reaches, among `browsers`, those running only (none is started): one
 * script for all of them. macOS asks, the first time, whether the app may control each one.
 */
export async function listScriptableTabs(browsers: readonly FoundBrowser[], run = runProgram): Promise<EverydayBrowser[]> {
  const ids = new Map(browsers.flatMap((b) => {
    const app = scriptableApp(b);
    return app ? [[app, b.id] as const] : [];
  }));
  if (!ids.size) return [];
  return scriptTabsOf(await run(OSASCRIPT, [...JXA_FLAGS, tabsScript([...ids.keys()])], SCRIPT_TIMEOUT_MS), ids);
}
