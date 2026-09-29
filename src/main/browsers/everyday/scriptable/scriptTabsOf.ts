import type { EverydayBrowser } from '../../../../shared/types';
import { HTTP_URL } from '../../../constants';
import { NOT_ALLOWED_ERROR } from './constants';

/** What the script says of one app. */
interface ScriptedApp {
  name?: unknown;
  running?: unknown;
  tabs?: unknown;
  error?: unknown;
}

/**
 * The tabs {@link tabsScript} read, app by app (by the browser id `ids` gives each name): only running apps, only pages
 * on the web (titled by their address when they have no title), and why an app's couldn't be read.
 */
export function scriptTabsOf(output: string, ids: ReadonlyMap<string, string>): EverydayBrowser[] {
  let apps: unknown;
  try {
    apps = JSON.parse(output);
  } catch {
    return [];
  }
  if (!Array.isArray(apps)) return [];
  return (apps as ScriptedApp[]).flatMap(({ name, running, tabs, error }) => {
    const id = typeof name === 'string' ? ids.get(name) : undefined;
    if (!id || running !== true) return [];
    const pairs = Array.isArray(tabs) ? (tabs as unknown[]).filter((t): t is [string, unknown] => Array.isArray(t) && typeof t[0] === 'string' && HTTP_URL.test(t[0])) : [];
    const browser: EverydayBrowser = { id, name: name as string, profile: null, tabs: pairs.map(([url, title]) => ({ url, title: typeof title === 'string' && title ? title : url })) };
    if (typeof error !== 'string') return [browser];
    const problem = error.includes(NOT_ALLOWED_ERROR) ? `Allow Console Editor to control ${String(name)} in System Settings › Privacy & Security › Automation` : `Could not read its tabs: ${error}`;
    return [{ ...browser, problem }];
  });
}
