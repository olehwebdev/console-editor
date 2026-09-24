import type { Workspace, WorkspacePatch, WorkspacesState } from '@common/types';

export interface WorkspaceStore {
  workspaces: Workspace[];
  /** The workspace shown; null until loaded. */
  activeId: string | null;
  /** Site icons (data URLs) by workspace id. */
  favicons: Record<string, string>;
  /** The workspace being switched to, while the switch runs. */
  switchingTo: string | null;

  setAll(state: WorkspacesState): void;
  patch(id: string, patch: WorkspacePatch): void;
  setFavicons(favicons: Record<string, string>): void;
  setFavicon(id: string, favicon: string | null): void;
  setSwitching(id: string | null): void;
}
