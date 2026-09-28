import type { BrowserInfo, DrivenBrowser } from '@common/types';

export interface BrowserStore {
  /** The browsers on this computer and the ones the user added, hidden ones too. */
  browsers: BrowserInfo[];
  /** Whether they have been looked for yet (the menu shows a spinner until then). */
  loaded: boolean;
  /** The Chromium browsers the app drives with the workspace's changes, with their tabs. */
  driven: DrivenBrowser[];

  setAll(browsers: BrowserInfo[]): void;
  setDriven(driven: DrivenBrowser[]): void;
}
