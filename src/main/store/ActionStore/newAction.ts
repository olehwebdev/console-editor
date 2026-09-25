import { randomBytes } from 'node:crypto';
import type { ActionInput } from '../../../shared/types';
import { ACTION_ID_BYTES } from './constants';
import type { StoredAction } from './types';

/** A new action of workspace `workspaceId`, made now, under an id none in `taken` has. */
export function newAction(input: ActionInput, workspaceId: string, taken: readonly StoredAction[]): StoredAction {
  let id: string;
  do id = randomBytes(ACTION_ID_BYTES).toString('hex');
  while (taken.some((a) => a.id === id));
  const now = Date.now();
  return { id, workspaceId, ...input, createdAt: now, updatedAt: now };
}
