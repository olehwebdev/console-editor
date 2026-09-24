import { motion } from 'motion/react';
import type { IconGlyph } from '@/shared/ui/icon';
import { icons } from '@/shared/config';
import { SPRING_LAYOUT } from '@/shared/lib';
import { IconButton } from '@/shared/ui/icon-button';
import { selectEnabledCount, useOverrideStore } from '@/entities/override';

export type SidebarView = 'explorer' | 'settings';

export interface ActivityBarProps {
  view: SidebarView | null;
  onViewChange(view: SidebarView): void;
  onOpenPalette(): void;
}

function RailItem({ id, icon, label, active, onClick, shortcut, badge }: { id: string; icon: IconGlyph; label: string; active: boolean; onClick(): void; shortcut?: string[]; badge?: React.ReactNode }) {
  return (
    <div className="relative flex w-full justify-center">
      {active ? (
        <motion.span layoutId="rail-indicator" transition={SPRING_LAYOUT} className="absolute inset-y-1 left-0 w-0.5 rounded-r-full bg-accent" />
      ) : null}
      <IconButton data-testid={`rail-${id}`} icon={icon} label={label} size="lg" active={active} onClick={onClick} shortcut={shortcut} tooltipSide="right" badge={badge} />
    </div>
  );
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
      <RailItem id="search" icon={icons.SearchIcon} label="Search files and commands" active={false} onClick={onOpenPalette} shortcut={['mod', 'K']} />
      <div className="flex-1" />
      <RailItem id="settings" icon={icons.SettingsIcon} label="Settings" active={view === 'settings'} onClick={() => onViewChange('settings')} />
    </nav>
  );
}
