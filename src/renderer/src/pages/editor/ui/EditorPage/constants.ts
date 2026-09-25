import type { ComponentType } from 'react';
import { ActionsPanel } from '@/widgets/actions-panel';
import type { SidebarView } from '@/widgets/activity-bar';
import { Explorer } from '@/widgets/explorer';
import { InspectPanel } from '@/widgets/inspect-panel';
import { SettingsPanel } from '@/widgets/settings-panel';

/** What the sidebar shows for each of its views. */
export const SIDEBAR_VIEWS: Record<SidebarView, ComponentType> = {
  explorer: Explorer,
  actions: ActionsPanel,
  inspect: InspectPanel,
  settings: SettingsPanel,
};

/** The sidebar view picking shows: what is under the pointer is told there. */
export const INSPECT_VIEW: SidebarView = 'inspect';
