import { icons } from '@/shared/config';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { attachActions, detachActions } from '@/features/action/detach';

/** In the sidebar while the actions are in their own window: bring that window forward, or put them back here. */
export function DetachedNotice() {
  return (
    <div data-testid="actions-detached" className="mx-3 mb-2 flex flex-col items-start gap-2 rounded-lg border border-line bg-surface-raised px-2.5 py-2 text-[12px] leading-snug text-fg-muted">
      <span>The actions are in their own window.</span>
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="secondary" leading={<Icon icon={icons.PopOutIcon} size={14} />} onClick={() => void detachActions()}>
          Show it
        </Button>
        <Button size="sm" variant="ghost" leading={<Icon icon={icons.DockIcon} size={14} />} onClick={() => void attachActions()}>
          Put them back here
        </Button>
      </div>
    </div>
  );
}
