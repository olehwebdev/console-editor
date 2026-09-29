import type { Shot } from '@common/types';
import { icons } from '@/shared/config';
import type { CommandGroup } from '@/shared/ui/command-palette';
import { openShot } from '@/features/shot/open-shot';

/** A palette item's id prefix for opening a shot. */
const SHOT_ITEM_PREFIX = 'shot:';

/** The workspace's captures and designs, each opened as its page. */
export function shotGroup(shots: Shot[]): CommandGroup {
  return {
    heading: 'Captures and designs',
    items: shots.map((shot) => ({ id: `${SHOT_ITEM_PREFIX}${shot.id}`, label: shot.name, hint: shot.pageUrl ?? undefined, icon: icons.ShotIcon, keywords: [shot.kind, shot.browser?.name ?? ''], onSelect: () => openShot(shot) })),
  };
}
