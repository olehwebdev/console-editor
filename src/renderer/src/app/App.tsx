import { MotionConfig } from 'motion/react';
import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/shared/ui/dialog';
import { ToastStack } from '@/shared/ui/toast';
import { EditorPage } from '@/pages/editor';
import { Gallery } from './gallery/Gallery';
import { setPageCommands, startBridge } from './model/bridge';

/** Root: global providers and overlays around the one page. `#gallery` shows the design system instead. */
export function App() {
  const gallery = location.hash === '#gallery';
  const [ready, setReady] = useState(gallery);

  useEffect(() => {
    if (gallery) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    void startBridge().then((off) => {
      if (cancelled) off();
      else {
        stop = off;
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [gallery]);

  useEffect(() => {
    if (ready) document.body.dataset.ready = 'true';
  }, [ready]);

  return (
    <MotionConfig reducedMotion="user">
      {gallery ? <Gallery /> : <EditorPage onCommands={setPageCommands} />}
      {/* Past the rail and never wider than the room left of the website preview (the native page view hides whatever overlaps it). */}
      <ToastStack className="bottom-9 left-[calc(var(--rail-w)+12px)] max-w-[calc(100vw-var(--rail-w)-var(--preview-w)-24px)]" />
      <ConfirmDialog />
    </MotionConfig>
  );
}
