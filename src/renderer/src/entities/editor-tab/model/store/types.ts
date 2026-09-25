import type { CreateRuleInput, ResourceKind } from '@common/types';

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

/** Unapplied edits in a rule page, with the saved input they were made to (dropped once that changes). */
export interface RulePageDraft {
  base: CreateRuleInput;
  value: CreateRuleInput;
  /** Parallel to value.headers (empty for other actions): stable React keys for the header rows. */
  rowKeys: string[];
}

interface PageTabBase {
  id: string;
  title: string;
}

/** A tab showing an app page rather than a file (like VS Code's release notes). Not kept between runs. */
export type PageTab =
  | (PageTabBase & { page: 'whats-new' })
  /** A saved rule's editor. */
  | (PageTabBase & { page: 'rule'; ruleId: string; draft?: RulePageDraft })
  /** A rule being written, not created yet. */
  | (PageTabBase & { page: 'new-rule'; seed: CreateRuleInput; draft?: RulePageDraft });

export type PageKind = PageTab['page'];

/** The page tab of one kind. */
export type PageTabOf<K extends PageKind> = Extract<PageTab, { page: K }>;

/** Whether a page belongs to the app, or to the workspace shown (closed when that changes). */
export type PageScope = 'app' | 'workspace';

export interface TabStore {
  /** File tabs. Pages are kept apart, so everything that works on files ignores them. */
  tabs: TabMeta[];
  pages: PageTab[];
  /** The active file tab or page. */
  activeId: string | null;
  diff: DiffMode;

  /** Adds a tab, and makes it the active one unless `activate` is false. */
  add(tab: TabMeta, activate?: boolean): void;
  /**
   * Shows a page, opening its tab (after the file tabs) if it isn't open yet. An open page with
   * the same id takes the new fields in place, keeping its position and anything not given (its draft).
   */
  openPage(page: PageTab): void;
  activate(id: string): void;
  /** Closes a file tab or a page. */
  remove(id: string): void;
  /** Closes every file tab (pages stay open). */
  removeTabs(): void;
  /** Closes these pages; when the active one goes, its neighbour takes over as with `remove`. */
  removePages(ids: readonly string[]): void;
  patch(id: string, patch: Partial<TabMeta>): void;
  /** Keeps (or, with undefined, drops) a rule page's unapplied edits. */
  setPageDraft(id: string, draft: RulePageDraft | undefined): void;
  setDiff(mode: DiffMode): void;
}
