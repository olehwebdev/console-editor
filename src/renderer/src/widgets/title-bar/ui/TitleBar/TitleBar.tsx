import { icons } from '@/shared/config';
import { cn, hostOf, pathSegments } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { Kbd } from '@/shared/ui/kbd';
import type { TooltipSide } from '@/shared/ui/tooltip';
import { selectActiveTab, useTabStore } from '@/entities/editor-tab';
import { usePageStore } from '@/entities/page';
import { BrandMark } from './BrandMark';

/** Shortcut hints (Kbd's notation), matching the app menu. Not `as const`: Kbd and IconButton take a mutable `string[]`. */
const SHORTCUT = { palette: ['mod', 'K'], sidebar: ['mod', 'B'] } satisfies Record<string, string[]>;

/** The layout toggles' tooltips open into the window, below the title bar. */
const TOOLTIP_SIDE: TooltipSide = 'bottom';

export interface TitleBarProps {
  onOpenPalette(): void;
  sidebarVisible: boolean;
  previewVisible: boolean;
  onToggleSidebar(): void;
  onTogglePreview(): void;
}

/** Brand, site and file location, command palette trigger, layout toggles. */
export function TitleBar({ onOpenPalette, sidebarVisible, previewVisible, onToggleSidebar, onTogglePreview }: TitleBarProps) {
  const url = usePageStore((s) => s.page.url);
  const title = usePageStore((s) => s.page.title);
  const activeUrl = useTabStore((s) => selectActiveTab(s)?.url ?? null);
  const segments = activeUrl ? pathSegments(activeUrl) : [];

  return (
    <header className="flex h-[var(--titlebar-h)] shrink-0 items-center gap-3 border-b border-line bg-canvas px-3" data-testid="title-bar">
      <BrandMark />
      <div className="flex min-w-0 items-center gap-2 text-[13px]">
        <span
          className="flex max-w-[260px] items-center gap-1.5 rounded-lg border border-line bg-surface-raised/60 px-2 py-1 text-fg"
          title={url ? `${title}\n${url}` : 'No site open'}
        >
          <Icon icon={icons.GlobeIcon} size={13} className={url ? 'text-info' : 'text-fg-subtle'} />
          <span className="truncate font-medium">{url ? hostOf(url) : 'Console Editor'}</span>
        </span>
        {segments.length ? (
          <span className="flex min-w-0 items-center gap-1 text-fg-subtle">
            <span>/</span>
            {segments.slice(0, -1).map((s, i) => (
              <span key={i} className="hidden items-center gap-1 lg:flex">
                <span className="truncate">{s}</span>
                <Icon icon={icons.ChevronRightIcon} size={11} />
              </span>
            ))}
            <span className="truncate font-medium text-fg">{segments.at(-1)}</span>
          </span>
        ) : null}
      </div>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onOpenPalette}
        data-testid="palette-trigger"
        className={cn(
          'flex h-7 w-[280px] items-center gap-2 rounded-lg border border-line bg-surface-raised/60 px-2.5 text-[12.5px] text-fg-subtle',
          'transition-[border-color,background-color,color] duration-150 ease-out-expo hover:border-line-strong hover:bg-surface-raised hover:text-fg-muted',
        )}
      >
        <Icon icon={icons.SearchIcon} size={14} />
        <span className="flex-1 text-left">Search files and commands</span>
        <Kbd keys={SHORTCUT.palette} />
      </button>

      <div className="flex items-center gap-0.5">
        <IconButton icon={icons.SidebarLeftIcon} label={sidebarVisible ? 'Hide sidebar' : 'Show sidebar'} shortcut={SHORTCUT.sidebar} aria-pressed={sidebarVisible} onClick={onToggleSidebar} tooltipSide={TOOLTIP_SIDE} />
        <IconButton icon={icons.PreviewIcon} label={previewVisible ? 'Hide website preview' : 'Show website preview'} aria-pressed={previewVisible} onClick={onTogglePreview} tooltipSide={TOOLTIP_SIDE} />
      </div>
    </header>
  );
}
