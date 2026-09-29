import type { BrowserEngine } from '../../../shared/types';

/** A browser the user added by picking its program (or app, on macOS). */
export interface AddedBrowser {
  /** `added:` and 8 hex chars. */
  id: string;
  name: string;
  path: string;
  engine: BrowserEngine;
}

/** What the user changed about the browsers offered: the ones they added, and the ones they turned off. */
export interface BrowserPrefs {
  added: AddedBrowser[];
  /** Ids of browsers not offered beside the address bar. */
  hidden: string[];
}
