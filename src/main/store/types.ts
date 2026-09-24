import type { Override, OverrideMeta, SessionTab, WorkspaceColor, WorkspaceIcon } from '../../shared/types';

/** An override as kept here, with the workspace it belongs to. */
export type StoredOverride = Override & { workspaceId: string };

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
}

/** The session file's contents: every workspace, and the one in use. */
export interface SessionFileState {
  activeId: string;
  workspaces: WorkspaceRecord[];
}
