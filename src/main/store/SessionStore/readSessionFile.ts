import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { sanitizePage } from '../sanitizePage';
import { sanitizeWorkspace } from '../sanitizeWorkspace';
import type { SessionFileState, WorkspaceRecord } from '../types';
import { blankWorkspace } from './blankWorkspace';
import { MAX_WORKSPACES, SESSION_FILE } from './constants';

/**
 * The session file in `dir`, sanitized: at least one workspace, and an active one.
 * `migrated` when it was a version 1 file, which should be written again as the current version.
 */
export async function readSessionFile(dir: string): Promise<{ state: SessionFileState; migrated: boolean }> {
  let saved: Record<string, unknown> | null = null;
  try {
    saved = JSON.parse(await readFile(join(dir, SESSION_FILE), 'utf8')) as Record<string, unknown>;
  } catch {
    // Missing or corrupt: start with one empty workspace.
  }
  const workspaces: WorkspaceRecord[] = [];
  let migrated = false;
  if (Array.isArray(saved?.workspaces)) {
    for (const input of saved.workspaces.slice(0, MAX_WORKSPACES)) {
      const w = sanitizeWorkspace(input);
      if (w && !workspaces.some((other) => other.id === w.id)) workspaces.push(w);
    }
  } else if (saved) {
    // Version 1 kept one page and its tabs: they become the first workspace.
    workspaces.push({ ...blankWorkspace([]), ...sanitizePage(saved) });
    migrated = true;
  }
  if (!workspaces.length) workspaces.push(blankWorkspace([]));
  const activeId = workspaces.find((w) => w.id === saved?.activeId)?.id ?? workspaces[0].id;
  return { state: { activeId, workspaces }, migrated };
}
