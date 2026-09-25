import { PaneTabs } from '@/shared/ui/pane-tabs';
import { useHeldStore } from '@/entities/held-request';
import { type BottomView, useLayout } from '../../model/layout';
import { BOTTOM_PANELS, BOTTOM_TABS } from './constants';
import { saveAsAction } from './saveAsAction';

// Actions never change, so they are read once instead of subscribed to.
const { showBottomView, toggleConsole } = useLayout.getState();

/** The bottom pane's panel (the console or the network log), headed by the tabs that switch between them. */
export function BottomPanel() {
  const view = useLayout((s) => s.bottomView);
  const held = useHeldStore((s) => s.held.length);
  const Panel = BOTTOM_PANELS[view];
  // What waits in each view: requests paused at a breakpoint.
  const counts: Partial<Record<BottomView, number>> = { network: held };
  const tabs = BOTTOM_TABS.map((tab) => ({ ...tab, count: counts[tab.id] }));
  return (
    <Panel
      heading={<PaneTabs tabs={tabs} value={view} onChange={showBottomView} label="Bottom panel" caps />}
      onClose={toggleConsole}
      onSaveAsAction={saveAsAction}
    />
  );
}
