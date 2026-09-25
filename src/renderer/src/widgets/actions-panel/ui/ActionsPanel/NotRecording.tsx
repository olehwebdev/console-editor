import { Button } from '@/shared/ui/button';
import { setSetting } from '@/features/update-settings';

/** Actions run in the frames the console records: while it doesn't, there are none to run in. */
export function NotRecording() {
  return (
    <div className="mx-3 mb-2 flex flex-col items-start gap-2 rounded-lg border border-warning/30 bg-warning/8 px-2.5 py-2 text-[12px] leading-snug text-fg-muted">
      <span>The console isn't recording, so actions have no frames to run in.</span>
      <Button size="sm" variant="secondary" onClick={() => void setSetting('captureConsole', true)}>
        Turn it on
      </Button>
    </div>
  );
}
