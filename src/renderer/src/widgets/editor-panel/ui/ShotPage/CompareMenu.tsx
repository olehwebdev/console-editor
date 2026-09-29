import type { Shot } from '@common/types';
import { icons } from '@/shared/config';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Menu, type MenuItem } from '@/shared/ui/menu';
import { useShotStore } from '@/entities/shot';
import { compareWithPage, openCompare } from '@/features/shot/compare';

/** How many of the workspace's other shots the menu offers (the newest). */
const MAX_OFFERED = 15;

/**
 * Compare with…: the page as it is now, captured laid out at this shot's width, or another shot. A design goes below
 * whatever it is compared with.
 */
export function CompareMenu({ shot }: { shot: Shot }) {
  const others = useShotStore((s) => s.shots);
  const compare = (other: Shot) => (other.kind === 'design' && shot.kind !== 'design' ? openCompare(other, shot) : openCompare(shot, other));
  const items: MenuItem[] = [
    { label: `The page now, ${Math.round(shot.width / shot.scale)} wide`, icon: icons.CaptureIcon, onSelect: () => void compareWithPage(shot) },
    ...others
      .filter((other) => other.id !== shot.id)
      .slice(0, MAX_OFFERED)
      .flatMap((other, i): MenuItem[] => [...(i === 0 ? [{ separator: true } as const] : []), { label: other.name, icon: icons.ShotIcon, onSelect: () => compare(other) }]),
  ];
  return (
    <Menu items={items} label="Compare with" align="end">
      <Button size="sm" variant="secondary" leading={<Icon icon={icons.DiffIcon} size={14} />} data-testid="shot-compare">
        Compare with…
      </Button>
    </Menu>
  );
}
