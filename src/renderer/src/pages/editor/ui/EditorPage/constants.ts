import type { ComponentType } from 'react';
import { ActionsPanel } from '@/widgets/actions-panel';
import type { SidebarView } from '@/widgets/activity-bar';
import { Explorer } from '@/widgets/explorer';
import { SettingsPanel } from '@/widgets/settings-panel';

/** What the sidebar shows for each of its views. */
export const SIDEBAR_VIEWS: Record<SidebarView, ComponentType> = {
  explorer: Explorer,
  actions: ActionsPanel,
  settings: SettingsPanel,
};
