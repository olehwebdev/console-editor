import type { ResourceKind, SourceMapKind } from '@common/types';

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

/** A read-only original from a bundle's source map. Not kept between runs; closes with the file tabs. */
export interface SourceTab {
  id: string;
  /** The original's URL as the map resolves it: its identity in the map, label and breadcrumbs. */
  url: string;
  /** The bundle whose map lists it: where Go to bundle code goes. */
  bundleUrl: string;
  bundleKind: SourceMapKind;
  /** Display name of its language (status bar). */
  languageName: string;
  /** Opened in highlight-only mode because the original is huge. */
  lite: boolean;
  /** The map lists it without its text: there is no model, and the panel says so. */
  missing: boolean;
}

export interface TabStore {
  /** File tabs. Sources and pages are kept apart, so everything that works on files ignores them. */
  tabs: TabMeta[];
  sources: SourceTab[];
  pages: PageTab[];
  /** The active file tab or page. */
  activeId: string | null;
  diff: DiffMode;

  /** Adds a tab, and makes it the active one unless `activate` is false. */
  add(tab: TabMeta, activate?: boolean): void;
  /** Adds a source tab after the file tabs (unless its id is open), and activates it unless `activate` is false. */
  openSource(tab: SourceTab, activate?: boolean): void;
  /** Shows a page, opening its tab (after the file and source tabs) if it isn't open yet. */
  openPage(page: PageTab): void;
  activate(id: string): void;
  /** Closes a file tab, source tab or page. */
  remove(id: string): void;
  /** Closes every file and source tab (pages stay open). */
  removeTabs(): void;
  patch(id: string, patch: Partial<TabMeta>): void;
  setDiff(mode: DiffMode): void;
}
