import type { BrowserInfo, DrivenBrowser, EverydayBrowser } from './browsers';

/** The other browsers' part of the API exposed to the renderer (`ConsoleEditorApi`). */
export interface BrowsersApi {
  /** The browsers on this computer and the ones the user added, hidden ones too; looked for again at most once a minute. */
  listBrowsers(): Promise<BrowserInfo[]>;
  /** Opens an http(s) address in one of them, with its everyday profile. */
  openInBrowser(id: string, url: string): Promise<void>;
  /** Asks for a browser's program with the system's dialog and adds it; null when none was picked. */
  addBrowser(): Promise<BrowserInfo | null>;
  /** Removes a browser the user added. */
  removeBrowser(id: string): Promise<void>;
  /** Offers a browser beside the address bar again, or stops offering it. */
  setBrowserHidden(id: string, hidden: boolean): Promise<void>;
  /**
   * Opens an http(s) address in a Chromium browser or Firefox with a profile of the app's own, serving the workspace's
   * overrides and rules in its tabs (launching it, or reaching it when the app launched it before and it is still open);
   * with `everyday`, in your everyday Chromium browser, remote debugging turned on for it (only the tabs the app opens).
   */
  openWithChanges(id: string, url: string, everyday?: boolean): Promise<void>;
  /** The browsers the app drives, with their tabs. */
  listDriven(): Promise<DrivenBrowser[]>;
  /** Brings a tab of a driven browser to the front. */
  activateTab(browserId: string, tabId: string): Promise<void>;
  /** The tabs open in your everyday browsers: Firefox's session files, macOS scripting (read when asked, and nowhere else). */
  listEverydayTabs(): Promise<EverydayBrowser[]>;
  /** Downloads a browser build the app keeps (Playwright's WebKit), its progress announced as `browser-download`. */
  downloadBrowser(id: string): Promise<void>;
  /** Removes a browser build the app downloaded. */
  removeBrowserDownload(id: string): Promise<void>;
  /** Stops serving the workspace's changes in a driven browser (it stays open, as it is). */
  stopDriving(browserId: string): Promise<void>;
}
