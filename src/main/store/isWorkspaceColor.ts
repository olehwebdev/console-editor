import { WORKSPACE_COLORS, type WorkspaceColor } from '../../shared/types';

export function isWorkspaceColor(value: unknown): value is WorkspaceColor {
  return WORKSPACE_COLORS.includes(value as WorkspaceColor);
}
