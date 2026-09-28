import type { BrowserInfo } from './browsers';

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
}
