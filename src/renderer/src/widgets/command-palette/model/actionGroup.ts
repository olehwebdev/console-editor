import type { ConsoleAction, ConsoleFrame } from '@common/types';
import { icons } from '@/shared/config';
import type { CommandGroup } from '@/shared/ui/command-palette';
import { locateTarget } from '@/entities/frame';
import { attachActions, detachActions } from '@/features/action/detach';
import { runAction } from '@/features/action/run';

/** An action's item id: this prefix and its id. */
const ACTION_ITEM_PREFIX = 'action-';

/** What the group needs besides the actions and the page's frames. */
export interface ActionGroupContext {
  /** The workspace's frame names. */
  names: Readonly<Record<string, string>>;
  /** The Actions panel is in its own window. */
  detached: boolean;
  onNewAction(): void;
}

/** The workspace's actions, each run in its frame when picked, then items that make a new one and move the panel. */
export function actionGroup(actions: readonly ConsoleAction[], frames: readonly ConsoleFrame[], { names, detached, onNewAction }: ActionGroupContext): CommandGroup {
  return {
    heading: 'Run action',
    items: [
      ...actions.map((action) => ({
        id: `${ACTION_ITEM_PREFIX}${action.id}`,
        label: action.name,
        hint: `in ${locateTarget(frames, names, action.target, action.targetName).label}`,
        icon: icons.RunIcon,
        keywords: ['action', 'run'],
        onSelect: () => void runAction(action),
      })),
      { id: 'action-new', label: 'New action…', icon: icons.AddIcon, keywords: ['action', 'snippet', 'event', 'frame'], onSelect: onNewAction },
      detached
        ? { id: 'actions-window', label: 'Put the actions back in the sidebar', icon: icons.DockIcon, keywords: ['action', 'window', 'dock'], onSelect: () => void attachActions() }
        : { id: 'actions-window', label: 'Open the actions in their own window', icon: icons.PopOutIcon, keywords: ['action', 'window', 'detach', 'screen'], onSelect: () => void detachActions() },
    ],
  };
}
