import type { ResourceKind } from '@common/types';

export type DiffMode = 'off' | 'base' | 'live';

/** Serializable tab metadata. The Monaco model lives in `models/`, keyed by `id`. */
export interface TabMeta {
  id: string;
  url: string;
  kind: ResourceKind;
  /** Set once the tab is saved as an override. */
  overrideId?: string;
  /** Hash of the upstream file this tab was forked from (for new overrides). */
  originalHash: string | null;
  /** Opened in highlight-only mode because the file is huge. */
  lite: boolean;
  dirty: boolean;
  saving: boolean;
}

/** A tab showing an app page rather than a file (like VS Code's release notes). Not kept between runs. */
export interface PageTab {
  id: string;
  page: 'whats-new';
  title: string;
}

export interface TabStore {
  /** File tabs. Pages are kept apart, so everything that works on files ignores them. */
  tabs: TabMeta[];
  pages: PageTab[];
  /** The active file tab or page. */
  activeId: string | null;
  diff: DiffMode;

  /** Adds a tab, and makes it the active one unless `activate` is false. */
  add(tab: TabMeta, activate?: boolean): void;
  /** Shows a page, opening its tab (after the file tabs) if it isn't open yet. */
  openPage(page: PageTab): void;
  activate(id: string): void;
  /** Closes a file tab or a page. */
  remove(id: string): void;
  patch(id: string, patch: Partial<TabMeta>): void;
  setDiff(mode: DiffMode): void;
}
