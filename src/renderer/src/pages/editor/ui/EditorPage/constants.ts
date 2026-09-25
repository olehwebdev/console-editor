import type { ComponentType, ReactNode } from 'react';
import type { PaneTab } from '@/shared/ui/pane-tabs';
import { ActionsPanel } from '@/widgets/actions-panel';
import type { SidebarView } from '@/widgets/activity-bar';
import { ConsolePanel, type ConsolePanelProps } from '@/widgets/console-panel';
import { Explorer } from '@/widgets/explorer';
import { InspectPanel } from '@/widgets/inspect-panel';
import { NetworkPanel } from '@/widgets/network-panel';
import { RendersPanel } from '@/widgets/renders-panel';
import { StoresPanel } from '@/widgets/stores-panel';
import { SettingsPanel } from '@/widgets/settings-panel';
import type { BottomView } from '../../model/layout';

/** What the sidebar shows for each of its views. */
export const SIDEBAR_VIEWS: Record<SidebarView, ComponentType> = {
  explorer: Explorer,
  actions: ActionsPanel,
  inspect: InspectPanel,
  settings: SettingsPanel,
};

/** The sidebar view picking shows: what is under the pointer is told there. */
export const INSPECT_VIEW: SidebarView = 'inspect';

/** The bottom pane's tabs, in order. */
export const BOTTOM_TABS: readonly PaneTab<BottomView>[] = [
  { id: 'console', label: 'Console' },
  { id: 'network', label: 'Network' },
  { id: 'renders', label: 'Renders' },
  { id: 'stores', label: 'Stores' },
];

/** What a bottom panel is given: the pane's tabs as its heading, closing the pane, and (the console's) keeping code as an action. */
type BottomPanelProps = { heading: ReactNode; onClose(): void } & Pick<ConsolePanelProps, 'onSaveAsAction'>;

/** The panel each tab shows: a new view fails typecheck until it has one. */
export const BOTTOM_PANELS: Record<BottomView, ComponentType<BottomPanelProps>> = {
  console: ConsolePanel,
  network: NetworkPanel,
  renders: RendersPanel,
  stores: StoresPanel,
};
