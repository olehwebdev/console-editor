import { icons } from '@/shared/config';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { setSetting } from '@/features/update-settings';

/** The frames, and where their code runs, come from recording the console: while it doesn't, there is nothing to look at. */
export function StackNotRecording() {
  return (
    <EmptyState
      icon={icons.StackIcon}
      title="The console isn't recording"
      className="mt-16"
      actions={
        <Button size="sm" variant="secondary" onClick={() => void setSetting('captureConsole', true)}>
          Turn it on
        </Button>
      }
    >
      The page stack looks at the frames the console records.
    </EmptyState>
  );
}
