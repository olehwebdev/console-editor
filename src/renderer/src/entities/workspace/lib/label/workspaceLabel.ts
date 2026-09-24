import type { Named } from './types';

/** What a workspace is called: its name, or else the host of its page. */
export function workspaceLabel(w: Named): string {
  return w.name.trim() || w.host || 'New workspace';
}
