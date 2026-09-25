import type { ConsoleAction } from '../../../shared/types';

/** An action as kept here, with the workspace it belongs to. */
export type StoredAction = ConsoleAction & { workspaceId: string };

/** The actions file's contents. */
export interface ActionsFile {
  version: number;
  actions: StoredAction[];
}
