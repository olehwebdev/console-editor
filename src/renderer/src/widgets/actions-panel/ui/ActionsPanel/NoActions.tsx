import { icons } from '@/shared/config';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/ui/icon';

/** What the panel says before there is any action, with a way to make the first. */
export function NoActions({ onNew }: { onNew(): void }) {
  return (
    <EmptyState
      icon={icons.ActionsIcon}
      title="No actions yet"
      size="sm"
      className="py-6"
      actions={
        <Button size="sm" variant="secondary" leading={<Icon icon={icons.AddIcon} size={14} />} onClick={onNew}>
          New action
        </Button>
      }
    >
      Keep code you run in a frame, such as an event sent to one service, and run it again with one click. You can also save a line you ran in the console.
    </EmptyState>
  );
}
