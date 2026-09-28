import type { Shot } from '@common/types';
import { icons } from '@/shared/config';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Menu, type MenuItem } from '@/shared/ui/menu';
import { PaneTabs } from '@/shared/ui/pane-tabs';
import { GROUP_VIEWS } from './constants';
import { shotLabel } from './shotLabel';
import type { GroupView } from './types';

export interface GroupHeaderProps {
  /** The group's captures, the app's first. */
  members: Shot[];
  /** The workspace's designs, offered as the baseline too. */
  designs: Shot[];
  base: Shot;
  onBase(id: string): void;
  view: GroupView;
  onView(view: GroupView): void;
}

/** The group's address and viewport, what each capture is compared with (one of them, or a design), and what the cells show. */
export function GroupHeader({ members, designs, base, onBase, view, onView }: GroupHeaderProps) {
  const [first] = members;
  const baseline = (shot: Shot): MenuItem => ({ label: shotLabel(shot), icon: shot.kind === 'design' ? icons.ImportDesignIcon : icons.BrowserIcon, checked: shot.id === base.id, onSelect: () => onBase(shot.id) });
  const items: MenuItem[] = [...members.map(baseline), ...(designs.length ? [{ separator: true } as const, ...designs.map(baseline)] : [])];
  return (
    <header className="flex shrink-0 flex-col gap-1 border-b border-line px-4 pt-2">
      <div className="flex min-w-0 items-baseline gap-2">
        <h1 className="min-w-0 truncate text-[15px] font-semibold text-fg" data-testid="group-title" title={first?.pageUrl ?? undefined}>
          {first?.pageUrl} <span className="font-normal text-fg-subtle">in {members.length === 1 ? '1 browser' : `${members.length} browsers`}</span>
        </h1>
        {first?.viewport ? <span className="shrink-0 font-mono text-[11px] text-fg-subtle">{`${first.viewport.width} × ${first.viewport.height} @${first.scale}×`}</span> : null}
      </div>
      <div className="flex h-8 items-stretch gap-2">
        <PaneTabs<GroupView> tabs={GROUP_VIEWS} value={view} onChange={onView} label="Show" />
        <span className="flex-1" />
        <Menu items={items} label="Compare with" align="end">
          <Button size="sm" variant="ghost" className="self-center" leading={<Icon icon={icons.DiffIcon} size={14} />} trailing={<Icon icon={icons.ChevronDownIcon} size={12} />} data-testid="group-baseline">
            Baseline: {shotLabel(base)}
          </Button>
        </Menu>
      </div>
    </header>
  );
}
