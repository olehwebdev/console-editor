import type { ConsoleAction } from '../../../shared/types';
import type { StoredAction } from './types';

/** An action as the renderer sees it: without the workspace it belongs to. */
export function toAction({ workspaceId: _workspaceId, ...action }: StoredAction): ConsoleAction {
  return action;
}
