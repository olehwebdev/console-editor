import type { Override, OverrideMeta, Rule, SessionTab, WorkspaceColor, WorkspaceIcon } from '../../shared/types';

/** An override as kept here, with the workspace it belongs to. */
export type StoredOverride = Override & { workspaceId: string };

/** A rule as kept on disk and in memory: with its workspace (never sent to the renderer). */
export type StoredRule = Rule & { workspaceId: string };

/** The rule store's state: the rules this build reads, and the entries it doesn't, kept verbatim. */
export interface RuleState {
  rules: Map<string, StoredRule>;
  foreign: unknown[];
}

/** An override's entry in the index file: everything but its content. */
export type IndexEntry = OverrideMeta & { workspaceId: string };

/** A workspace as stored: its rail tile, its page and its tabs. */
export interface WorkspaceRecord {
  id: string;
  name: string;
  icon: WorkspaceIcon;
  color: WorkspaceColor;
  /** Last page shown ('' if none), and its title. */
  url: string;
  title: string;
  tabs: SessionTab[];
  activeTabId: string | null;
  /** Names given to the page's frames in the console, by frame address. */
  frameNames: Record<string, string>;
}

/** The session file's contents: every workspace, and the one in use. */
export interface SessionFileState {
  activeId: string;
  workspaces: WorkspaceRecord[];
}
