import { icons } from '@/shared/config';
import { selectEnabledCount, useOverrideStore } from '@/entities/override';
import { RailItem } from './RailItem';

/** Shortcut hints (Kbd's notation), matching the app menu. Not `as const`: IconButton takes a mutable `string[]`. */
const SHORTCUT = { palette: ['mod', 'K'] } satisfies Record<string, string[]>;

export type SidebarView = 'explorer' | 'settings';

export interface ActivityBarProps {
  view: SidebarView | null;
  onViewChange(view: SidebarView): void;
  onOpenPalette(): void;
}

/** Left rail: switches the sidebar view and opens the palette. */
export function ActivityBar({ view, onViewChange, onOpenPalette }: ActivityBarProps) {
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
      <RailItem id="search" icon={icons.SearchIcon} label="Search files and commands" active={false} onClick={onOpenPalette} shortcut={SHORTCUT.palette} />
      <div className="flex-1" />
      <RailItem id="settings" icon={icons.SettingsIcon} label="Settings" active={view === 'settings'} onClick={() => onViewChange('settings')} />
    </nav>
  );
}
