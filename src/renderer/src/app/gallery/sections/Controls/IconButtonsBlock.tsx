import { useState, type ReactNode } from 'react';
import { icons } from '@/shared/config';
import { Badge } from '@/shared/ui/badge';
import type { IconGlyph } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import type { TooltipSide } from '@/shared/ui/tooltip';
import { Block } from '../../Block';
import { SHORTCUT } from './constants';
import { Row } from './Row';

const {
  CloseIcon,
  DeleteIcon,
  DevToolsIcon,
  DiffIcon,
  ExplorerIcon,
  OverridesIcon,
  PrettifyIcon,
  PreviewIcon,
  ReloadIcon,
  SearchIcon,
  SettingsIcon,
} = icons;

/** `lg` is the activity-rail size; like the app's rail (ActivityBar), its tooltips open into the workspace. */
const RAIL_TOOLTIP_SIDE: TooltipSide = 'right';

const RAIL = { explorer: 'explorer', overrides: 'overrides', search: 'search' } as const;
type RailId = (typeof RAIL)[keyof typeof RAIL];

interface RailItem {
  id: RailId;
  icon: IconGlyph;
  label: string;
  shortcut?: string[];
  badge?: ReactNode;
}

const RAIL_ITEMS: readonly RailItem[] = [
  { id: RAIL.explorer, icon: ExplorerIcon, label: 'Explorer', shortcut: SHORTCUT.explorer },
  {
    id: RAIL.overrides,
    icon: OverridesIcon,
    label: 'Overrides',
    badge: <Badge tone="live" dot pulse className="h-auto border-0 bg-transparent px-0" />,
  },
  { id: RAIL.search, icon: SearchIcon, label: 'Search', shortcut: SHORTCUT.search },
];

export function IconButtonsBlock() {
  const [preview, setPreview] = useState(true);
  const [rail, setRail] = useState<RailId>(RAIL.explorer);
  return (
    <Block title="IconButton" hint="hover for the tooltip (400 ms), then slide along the toolbar: instant">
      <Row label="toolbar">
        <div className="flex items-center gap-0.5 rounded-xl border border-line bg-canvas p-1">
          <IconButton icon={ReloadIcon} label="Reload page" shortcut={SHORTCUT.reload} />
          <IconButton icon={DevToolsIcon} label="Toggle DevTools" shortcut={SHORTCUT.editorDevTools} />
          <IconButton icon={PrettifyIcon} label="Pretty-print" shortcut={SHORTCUT.prettify} />
          <IconButton icon={DiffIcon} label="Compare with original" />
          <IconButton icon={PreviewIcon} label="Page preview" active={preview} onClick={() => setPreview((v) => !v)} />
          <IconButton icon={DeleteIcon} label="Delete override" danger />
          <IconButton icon={SettingsIcon} label="Settings (disabled)" disabled />
        </div>
      </Row>
      <Row label="sizes">
        <IconButton size="sm" icon={CloseIcon} label="Close tab" />
        <IconButton size="md" icon={SearchIcon} label="Search" shortcut={SHORTCUT.palette} />
        <IconButton size="lg" icon={ExplorerIcon} label="Explorer" tooltipSide={RAIL_TOOLTIP_SIDE} />
      </Row>
      <Row label="rail">
        <div className="flex flex-col gap-1 rounded-xl border border-line bg-canvas p-1.5">
          {RAIL_ITEMS.map((item) => (
            <IconButton
              key={item.id}
              size="lg"
              icon={item.icon}
              label={item.label}
              shortcut={item.shortcut}
              tooltipSide={RAIL_TOOLTIP_SIDE}
              active={rail === item.id}
              aria-pressed={undefined}
              aria-current={rail === item.id ? 'page' : undefined}
              badge={item.badge}
              onClick={() => setRail(item.id)}
            />
          ))}
        </div>
      </Row>
    </Block>
  );
}
