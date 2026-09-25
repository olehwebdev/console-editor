import { cn } from '@/shared/lib';
import { useRenderLog } from '@/entities/inspector';
import { usePanelTab, type PanelTab } from '../../model/panel-tab';

const { show } = usePanelTab.getState();

/** What each of the panel's tabs is called. */
const TAB_LABEL: Record<PanelTab, string> = { console: 'Console', renders: 'Renders' };
const TABS: PanelTab[] = ['console', 'renders'];

/** The panel's tabs under the editor, in its toolbar: the console, and the Renders log (with a dot while it records). */
export function PanelTabs() {
  const tab = usePanelTab((s) => s.tab);
  const recording = useRenderLog((s) => s.recording);
  return (
    <div role="tablist" aria-label="Panel" className="flex items-center gap-0.5">
      {TABS.map((id) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={tab === id}
          onClick={() => show(id)}
          className={cn('label-caps flex h-6 items-center gap-1.5 rounded-md px-2 hover:bg-hover', tab === id ? 'bg-hover text-fg' : 'text-fg-subtle')}
          data-testid={`panel-tab-${id}`}
        >
          {TAB_LABEL[id]}
          {id === 'renders' && recording ? <span className="size-1.5 rounded-full bg-danger" /> : null}
        </button>
      ))}
    </div>
  );
}
