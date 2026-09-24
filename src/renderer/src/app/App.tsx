import { MotionConfig } from 'motion/react';
import { useEffect } from 'react';
import { GALLERY_HASH } from '@common/constants';
import { ConfirmDialog } from '@/shared/ui/dialog';
import { ToastStack } from '@/shared/ui/toast';
import { EditorPage, pageCommands, pageSession } from '@/pages/editor';
import { Gallery } from './gallery/Gallery';
import { markReady } from './lib/markReady';
import { startBridge } from './model/bridge';

/** Root: global providers and overlays around the one page. The gallery hash shows the design system instead. */
export function App() {
  const gallery = location.hash === `#${GALLERY_HASH}`;

  // The link to the main process lives as long as the app is mounted.
  useEffect(() => {
    if (gallery) return markReady();
    let stop: (() => void) | undefined;
    let cancelled = false;
    void startBridge(pageCommands, pageSession).then((off) => {
      if (cancelled) return off();
      stop = off;
      markReady();
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [gallery]);

  return (
    <MotionConfig reducedMotion="user">
      {gallery ? <Gallery /> : <EditorPage />}
      {/* Past the rail and never wider than the room left of the website preview (the native page view hides whatever overlaps it). */}
      <ToastStack className="bottom-9 left-[calc(var(--rail-w)+12px)] max-w-[calc(100vw-var(--rail-w)-var(--preview-w)-24px)]" />
      <ConfirmDialog />
    </MotionConfig>
  );
}
