import type { CaptureArea } from '@common/types';
import { icons } from '@/shared/config';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Menu, type MenuItem } from '@/shared/ui/menu';

export interface CaptureMenuProps {
  /** Capturing an element is offered (where picking one shows its component: the editor). */
  canPick: boolean;
  disabled: boolean;
  onCapture(area: CaptureArea): void;
}

/** The shots menu's Capture: what the page shows, the whole page, or an element picked in it. */
export function CaptureMenu({ canPick, disabled, onCapture }: CaptureMenuProps) {
  const items: MenuItem[] = [
    { label: 'What the page shows', icon: icons.CaptureIcon, onSelect: () => onCapture('viewport') },
    { label: 'The whole page', icon: icons.FullPageIcon, onSelect: () => onCapture('page') },
    ...(canPick ? [{ label: 'An element…', icon: icons.PickIcon, onSelect: () => onCapture('element') }] : []),
  ];
  return (
    <Menu items={items} label="Capture" align="end" disabled={disabled}>
      <Button size="sm" variant="secondary" disabled={disabled} leading={<Icon icon={icons.CaptureIcon} size={14} />} trailing={<Icon icon={icons.ChevronDownIcon} size={12} />} data-testid="shots-capture">
        Capture
      </Button>
    </Menu>
  );
}
