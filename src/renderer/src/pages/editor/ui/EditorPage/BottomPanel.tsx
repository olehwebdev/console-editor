import { ConsolePanel } from '@/widgets/console-panel';
import { RendersPanel } from '@/widgets/renders-panel';
import { usePanelTab } from '../../model/panel-tab';
import { PanelTabs } from './PanelTabs';
import { saveAsAction } from './saveAsAction';

/** The panel under the editor: the console, or the Renders log, as its tabs choose. */
export function BottomPanel({ onClose }: { onClose(): void }) {
  const tab = usePanelTab((s) => s.tab);
  return tab === 'renders' ? <RendersPanel title={<PanelTabs />} onClose={onClose} /> : <ConsolePanel title={<PanelTabs />} onClose={onClose} onSaveAsAction={saveAsAction} />;
}
