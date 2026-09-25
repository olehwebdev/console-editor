import { randomBytes } from 'node:crypto';
import { WORKSPACE_COLORS } from '../../../shared/types';
import { DEFAULT_WORKSPACE_ICON, WORKSPACE_ID_BYTES } from '../constants';
import type { WorkspaceRecord } from '../types';

/** An empty workspace, in a colour none of `existing` has while there is one. */
export function blankWorkspace(existing: WorkspaceRecord[]): WorkspaceRecord {
  let id: string;
  do id = randomBytes(WORKSPACE_ID_BYTES).toString('hex');
  while (existing.some((w) => w.id === id));
  const used = new Set(existing.map((w) => w.color));
  const color = WORKSPACE_COLORS.find((c) => !used.has(c)) ?? WORKSPACE_COLORS[existing.length % WORKSPACE_COLORS.length];
  return { id, name: '', icon: DEFAULT_WORKSPACE_ICON, color, url: '', title: '', tabs: [], activeTabId: null, frameNames: {}, breakpoints: [] };
}
