import { WORKSPACE_ICONS, type WorkspaceIcon } from '../../shared/types';

export function isWorkspaceIcon(value: unknown): value is WorkspaceIcon {
  return WORKSPACE_ICONS.includes(value as WorkspaceIcon);
}
