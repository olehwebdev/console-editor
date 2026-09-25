import { PaneTabs } from '@/shared/ui/pane-tabs';
import { useLayout } from '../../model/layout';
import { BOTTOM_PANELS, BOTTOM_TABS } from './constants';
import { saveAsAction } from './saveAsAction';

// Actions never change, so they are read once instead of subscribed to.
const { showBottomView, toggleConsole } = useLayout.getState();

/** The bottom pane's panel (the console or the network log), headed by the tabs that switch between them. */
export function BottomPanel() {
  const view = useLayout((s) => s.bottomView);
  const Panel = BOTTOM_PANELS[view];
  return (
    <Panel
      heading={<PaneTabs tabs={BOTTOM_TABS} value={view} onChange={showBottomView} label="Bottom panel" caps />}
      onClose={toggleConsole}
      onSaveAsAction={saveAsAction}
    />
  );
}
