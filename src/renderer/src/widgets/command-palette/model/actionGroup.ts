import type { ConsoleAction, ConsoleFrame } from '@common/types';
import { icons } from '@/shared/config';
import type { CommandGroup } from '@/shared/ui/command-palette';
import { locateTarget } from '@/entities/frame';
import { runAction } from '@/features/action/run';

/** An action's item id: this prefix and its id. */
const ACTION_ITEM_PREFIX = 'action-';

/** The workspace's actions, each run in its frame when picked, then an item that makes a new one. */
export function actionGroup(
  actions: readonly ConsoleAction[],
  frames: readonly ConsoleFrame[],
  names: Readonly<Record<string, string>>,
  onNewAction: () => void,
): CommandGroup {
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
    ],
  };
}
