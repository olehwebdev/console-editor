import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { scanPageStack } from '@/features/inspect/stack';

/** The page's title, how many frames it has, and Scan again. */
export function StackPageHeader({ frames }: { frames: number }) {
  const [scanning, setScanning] = useState(false);
  const scan = async () => {
    setScanning(true);
    try {
      await scanPageStack();
    } finally {
      setScanning(false);
    }
  };
  return (
    <header className="flex items-end gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h1 className="text-lg font-semibold text-fg">Page stack</h1>
        <p className="text-[13px] text-fg-muted">
          What each frame of the page runs: {frames} {frames === 1 ? 'frame' : 'frames'}, looked at once they loaded.
        </p>
      </div>
      <Button size="sm" variant="secondary" loading={scanning} onClick={() => void scan()} data-testid="stack-scan">
        Scan again
      </Button>
    </header>
  );
}
