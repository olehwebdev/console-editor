import { readFile } from 'node:fs/promises';
import { sanitizeStoredAction } from './sanitizeStoredAction';
import type { StoredAction } from './types';

/** The actions in the file at `path`, sanitized, each id once; none when it is missing or corrupt. */
export async function readActions(path: string): Promise<StoredAction[]> {
  let saved: { actions?: unknown } | null = null;
  try {
    saved = JSON.parse(await readFile(path, 'utf8')) as { actions?: unknown };
  } catch {
    // Missing (none saved yet) or corrupt: start with none.
  }
  const actions: StoredAction[] = [];
  for (const input of Array.isArray(saved?.actions) ? saved.actions : []) {
    const action = sanitizeStoredAction(input);
    if (action && !actions.some((other) => other.id === action.id)) actions.push(action);
  }
  return actions;
}
