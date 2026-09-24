/** Colours a workspace's rail tile can take (tokens `--workspace-<colour>`). */
export const WORKSPACE_COLORS = ['ember', 'amber', 'lime', 'teal', 'sky', 'indigo', 'violet', 'rose'] as const;

export type WorkspaceColor = (typeof WORKSPACE_COLORS)[number];

/**
 * What a workspace's rail tile can show: the site's favicon (its colour stands in
 * until the site has one), or its colour with the first letter of its name.
 */
export const WORKSPACE_ICONS = ['favicon', 'color'] as const;

export type WorkspaceIcon = (typeof WORKSPACE_ICONS)[number];

/**
 * A saved workflow: a page, the tabs open on it with their unsaved edits, and
 * its own overrides. As the renderer sees it: the tabs come with `getSession`,
 * the favicon separately (it changes rarely, and is the biggest part).
 */
export interface Workspace {
  id: string;
  /** Given by you; '' shows `host` instead. */
  name: string;
  /** Host of the last page shown ('' if none). */
  host: string;
  /** Title of the last page shown ('' if none). */
  title: string;
  icon: WorkspaceIcon;
  color: WorkspaceColor;
  /** Names you gave the page's frames in the console, by frame address (see `frameAddress`). */
  frameNames: Record<string, string>;
}

export interface WorkspacePatch {
  name?: string;
  icon?: WorkspaceIcon;
  color?: WorkspaceColor;
  /** Replaces all of them. */
  frameNames?: Record<string, string>;
}

export interface WorkspacesState {
  workspaces: Workspace[];
  activeId: string;
}
