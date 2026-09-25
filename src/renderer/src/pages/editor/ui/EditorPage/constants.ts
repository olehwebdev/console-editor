import type { ComponentType, ReactNode } from 'react';
import type { PaneTab } from '@/shared/ui/pane-tabs';
import { ActionsPanel } from '@/widgets/actions-panel';
import type { SidebarView } from '@/widgets/activity-bar';
import { ConsolePanel, type ConsolePanelProps } from '@/widgets/console-panel';
import { Explorer } from '@/widgets/explorer';
import { NetworkPanel } from '@/widgets/network-panel';
import { SettingsPanel } from '@/widgets/settings-panel';
import type { BottomView } from '../../model/layout';

/** What the sidebar shows for each of its views. */
export const SIDEBAR_VIEWS: Record<SidebarView, ComponentType> = {
  explorer: Explorer,
  actions: ActionsPanel,
  settings: SettingsPanel,
};

/** The bottom pane's tabs, in order. */
export const BOTTOM_TABS: readonly PaneTab<BottomView>[] = [
  { id: 'console', label: 'Console' },
  { id: 'network', label: 'Network' },
];

/** What a bottom panel is given: the pane's tabs as its heading, closing the pane, and (the console's) keeping code as an action. */
type BottomPanelProps = { heading: ReactNode; onClose(): void } & Pick<ConsolePanelProps, 'onSaveAsAction'>;

/** The panel each tab shows: a new view fails typecheck until it has one. */
export const BOTTOM_PANELS: Record<BottomView, ComponentType<BottomPanelProps>> = {
  console: ConsolePanel,
  network: NetworkPanel,
};
