import type { BrowserInfo } from '@common/types';

export interface BrowserStore {
  /** The browsers on this computer and the ones the user added, hidden ones too. */
  browsers: BrowserInfo[];
  /** Whether they have been looked for yet (the menu shows a spinner until then). */
  loaded: boolean;

  setAll(browsers: BrowserInfo[]): void;
}
