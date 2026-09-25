import { WORKSPACE_ID } from '../constants';
import { actionFields } from './actionFields';
import { ACTION_ID } from './constants';
import type { StoredAction } from './types';

/** A well-formed action from the file, or null, so a corrupt file can't inject junk. */
export function sanitizeStoredAction(input: unknown): StoredAction | null {
  const a = input as Partial<StoredAction> | null;
  if (!a || typeof a.id !== 'string' || !ACTION_ID.test(a.id)) return null;
  if (typeof a.workspaceId !== 'string' || !WORKSPACE_ID.test(a.workspaceId)) return null;
  try {
    const now = Date.now();
    const createdAt = typeof a.createdAt === 'number' ? a.createdAt : now;
    const updatedAt = typeof a.updatedAt === 'number' ? a.updatedAt : createdAt;
    return { id: a.id, workspaceId: a.workspaceId, ...actionFields(a, true), createdAt, updatedAt };
  } catch {
    return null;
  }
}
