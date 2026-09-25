import type { RequestGroup } from '@/entities/network-request';

/** A group of requests, or every request. */
export type GroupChoice = RequestGroup | 'all';

export interface NetworkFilter {
  /** The group shown: Fetch/XHR by default, the requests a page's code makes. */
  group: GroupChoice;
  /** Shown rows' URLs contain this, ignoring case. */
  text: string;
  /** Rows of earlier page loads stay, as DevTools' "Preserve log". */
  keepRows: boolean;

  setGroup(group: GroupChoice): void;
  setText(text: string): void;
  toggleKeepRows(): void;
}
