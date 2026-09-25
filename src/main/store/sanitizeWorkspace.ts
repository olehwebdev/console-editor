import { MAX_WORKSPACE_NAME } from '../../shared/constants';
import { WORKSPACE_COLORS } from '../../shared/types';
import { DEFAULT_WORKSPACE_ICON, WORKSPACE_ID } from './constants';
import { isWorkspaceColor } from './isWorkspaceColor';
import { sanitizeFrameNames } from './sanitizeFrameNames';
import { isWorkspaceIcon } from './isWorkspaceIcon';
import { sanitizePage } from './sanitizePage';
import type { WorkspaceRecord } from './types';

/** A well-formed workspace, or null, so a corrupt file can't inject junk. */
export function sanitizeWorkspace(input: unknown): WorkspaceRecord | null {
  const w = input as Partial<WorkspaceRecord> | null;
  if (!w || typeof w.id !== 'string' || !WORKSPACE_ID.test(w.id)) return null;
  return {
    id: w.id,
    name: typeof w.name === 'string' ? w.name.slice(0, MAX_WORKSPACE_NAME) : '',
    icon: isWorkspaceIcon(w.icon) ? w.icon : DEFAULT_WORKSPACE_ICON,
    color: isWorkspaceColor(w.color) ? w.color : WORKSPACE_COLORS[0],
    frameNames: sanitizeFrameNames(w.frameNames),
    ...sanitizePage(w),
  };
}
