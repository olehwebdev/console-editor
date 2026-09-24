import type { Workspace } from '@common/types';

export interface WorkspaceListProps {
  onSwitch(id: string): void;
  onCreate(): void;
  onDelete(id: string): void;
}

/** The workspace being edited, and the tile the popover opens beside (kept while it animates out). */
export interface Editing {
  id: string;
  anchor: HTMLElement;
}

export interface TileProps {
  workspace: Workspace;
  /** The last one can't be deleted. */
  deletable: boolean;
  onSwitch(id: string): void;
  onEdit(id: string, tile: HTMLElement): void;
  onDelete(id: string): void;
}
