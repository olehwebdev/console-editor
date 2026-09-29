import type { Workspace } from '@common/types';
import { icons } from '@/shared/config';
import type { CommandGroup } from '@/shared/ui/command-palette';
import { workspaceDetail, workspaceLabel } from '@/entities/workspace';
import { WORKSPACE_ITEM_PREFIX } from './constants';

/** Switching to each workspace but the active one, and making a new one. */
export function workspaceGroup(workspaces: Workspace[], activeId: string | null, onSwitch: (id: string) => void, onNew: () => void): CommandGroup {
  return {
    heading: 'Workspaces',
    items: [
      ...workspaces
        .filter((w) => w.id !== activeId)
        .map((w) => ({
          id: `${WORKSPACE_ITEM_PREFIX}${w.id}`,
          label: `Switch to ${workspaceLabel(w)}`,
          hint: workspaceDetail(w) || undefined,
          icon: icons.BrowserIcon,
          keywords: ['workspace', w.host, w.title],
          onSelect: () => onSwitch(w.id),
        })),
      { id: 'workspace-new', label: 'New workspace', icon: icons.AddIcon, keywords: ['workspace', 'site', 'project'], onSelect: onNew },
    ],
  };
}
