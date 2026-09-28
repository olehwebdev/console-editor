import { icons } from '@/shared/config';
import { Counter } from '@/shared/ui/counter';
import { Icon } from '@/shared/ui/icon';
import { selectDrivenTabCount, useBrowserStore } from '@/entities/browser';
import { ITEM_ICON_SIZE } from './constants';

/** How many tabs of other browsers are served the workspace's changes. Hidden while there are none. */
export function DrivenChip() {
  const tabs = useBrowserStore(selectDrivenTabCount);
  const browsers = useBrowserStore((s) => s.driven.map((b) => b.name).join(', '));
  if (!tabs) return null;
  return (
    <span className="flex items-center gap-1.5" title={`Served your changes in ${browsers}`} data-testid="status-driven">
      <Icon icon={icons.BrowserIcon} size={ITEM_ICON_SIZE} className="text-live" />
      <Counter value={tabs} /> {tabs === 1 ? 'tab' : 'tabs'} in other browsers
    </span>
  );
}
