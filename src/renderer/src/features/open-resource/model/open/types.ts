export interface OpenOptions {
  /** Reuse this tab id (a tab reopened from the last session keeps its id, which names its draft). */
  tabId?: string;
  /** Open without switching to it. Default true. */
  activate?: boolean;
}
