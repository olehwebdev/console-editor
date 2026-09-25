import { MAX_WORKSPACE_NAME } from '../../../shared/constants';
import type { WorkspacePatch } from '../../../shared/types';
import { isWorkspaceColor } from '../isWorkspaceColor';
import { isWorkspaceIcon } from '../isWorkspaceIcon';
import { breakpointsProblem } from '../breakpointsProblem';
import { sanitizeBreakpoints } from '../sanitizeBreakpoints';
import { sanitizeFrameNames } from '../sanitizeFrameNames';
import type { WorkspaceRecord } from '../types';

/** `w` with `patch` applied; throws when a field of the patch isn't valid. */
export function patchWorkspace(w: WorkspaceRecord, patch: WorkspacePatch): WorkspaceRecord {
  const { name, icon, color, frameNames, breakpoints } = patch ?? {};
  if (name !== undefined && typeof name !== 'string') throw new Error('name must be a string');
  if (icon !== undefined && !isWorkspaceIcon(icon)) throw new Error(`Unsupported icon ${String(icon)}`);
  if (color !== undefined && !isWorkspaceColor(color)) throw new Error(`Unsupported colour ${String(color)}`);
  if (frameNames !== undefined && (typeof frameNames !== 'object' || frameNames === null)) throw new Error('frameNames must be an object');
  const breakpointProblem = breakpoints === undefined ? null : breakpointsProblem(breakpoints);
  if (breakpointProblem) throw new Error(breakpointProblem);
  return {
    ...w,
    ...(name !== undefined ? { name: name.slice(0, MAX_WORKSPACE_NAME) } : {}),
    ...(icon !== undefined ? { icon } : {}),
    ...(color !== undefined ? { color } : {}),
    ...(frameNames !== undefined ? { frameNames: sanitizeFrameNames(frameNames) } : {}),
    ...(breakpoints !== undefined ? { breakpoints: sanitizeBreakpoints(breakpoints) } : {}),
  };
}
