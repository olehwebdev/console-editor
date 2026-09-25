import { useWorkspaceStore } from './useWorkspaceStore';

/**
 * Whether a workspace is still the one shown, with no switch running: a result that arrives after
 * a switch belongs to the workspace it began in, not to the lists and tabs now shown.
 */
export function isWorkspaceShown(id: string | null): boolean {
  const { activeId, switchingTo } = useWorkspaceStore.getState();
  return activeId === id && switchingTo === null;
}
