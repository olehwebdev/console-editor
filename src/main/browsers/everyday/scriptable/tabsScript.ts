import { SCRIPTABLE_APPS } from './constants';

/**
 * A JavaScript for Automation script reading the tabs of each app named that is running (one that isn't is left
 * alone, not started): each window's tabs' addresses and titles in two requests, as JSON, `[{ name, running, tabs:
 * [[url, title]], error? }]`. A window without tabs (Safari's settings) is skipped; an app that refuses says why.
 */
export function tabsScript(apps: readonly string[]): string {
  const asked = JSON.stringify(apps.map((name) => [name, SCRIPTABLE_APPS[name]]));
  return `JSON.stringify(${asked}.map(([name, title]) => {
  try {
    const app = Application(name);
    if (!app.running()) return { name, running: false, tabs: [] };
    const tabs = app.windows().flatMap((w) => {
      try {
        const titles = w.tabs[title]();
        return w.tabs.url().map((url, i) => [url, titles[i]]);
      } catch (e) {
        return [];
      }
    });
    return { name, running: true, tabs };
  } catch (e) {
    return { name, running: true, tabs: [], error: String(e) };
  }
}))`;
}
