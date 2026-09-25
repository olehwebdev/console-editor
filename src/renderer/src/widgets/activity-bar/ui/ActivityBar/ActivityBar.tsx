import { SHORTCUT } from '@common/constants';
import { icons } from '@/shared/config';
import { selectEnabledCount, useOverrideStore } from '@/entities/override';
import { WorkspaceList } from '../WorkspaceList';
import { RailItem } from './RailItem';

export type SidebarView = 'explorer' | 'actions' | 'settings';

export interface ActivityBarProps {
  view: SidebarView | null;
  onViewChange(view: SidebarView): void;
  onOpenPalette(): void;
  onSwitchWorkspace(id: string): void;
  onNewWorkspace(): void;
  onDeleteWorkspace(id: string): void;
}

/** Left rail: switches the sidebar view, opens the palette, and switches workspaces. */
export function ActivityBar({ view, onViewChange, onOpenPalette, onSwitchWorkspace, onNewWorkspace, onDeleteWorkspace }: ActivityBarProps) {
  const liveCount = useOverrideStore(selectEnabledCount);
  return (
    <nav className="flex h-full w-[var(--rail-w)] shrink-0 flex-col items-center gap-1 border-r border-line bg-canvas py-2" aria-label="Views">
      <RailItem
        id="explorer"
        icon={icons.ExplorerIcon}
        label="Explorer"
        active={view === 'explorer'}
        onClick={() => onViewChange('explorer')}
        badge={liveCount ? <span className="size-1.5 rounded-full bg-live shadow-[0_0_6px_var(--live)]" /> : undefined}
      />
      <RailItem id="actions" icon={icons.ActionsIcon} label="Actions" active={view === 'actions'} onClick={() => onViewChange('actions')} />
      <RailItem id="search" icon={icons.SearchIcon} label="Search files and commands" active={false} onClick={onOpenPalette} shortcut={SHORTCUT.palette} />
      <div role="separator" className="my-1 h-px w-6 shrink-0 bg-line" />
      <WorkspaceList onSwitch={onSwitchWorkspace} onCreate={onNewWorkspace} onDelete={onDeleteWorkspace} />
      <div className="min-h-2 flex-1" />
      <RailItem id="settings" icon={icons.SettingsIcon} label="Settings" active={view === 'settings'} onClick={() => onViewChange('settings')} />
    </nav>
  );
}
