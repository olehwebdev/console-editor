import { MotionConfig } from 'motion/react';
import { useEffect } from 'react';
import { ConfirmDialog } from '@/shared/ui/dialog';
import { ToastStack } from '@/shared/ui/toast';
import { markReady } from './lib/markReady';
import { APP_VIEWS, appViewOf } from './model/views';

/** Root: global providers and overlays around the one page its window shows (the editor, the website's own window, or the gallery). */
export function App() {
  const view = APP_VIEWS[appViewOf(location.hash)];

  // The link to the main process lives as long as the app is mounted.
  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    void view.start().then((off) => {
      if (cancelled) return off();
      stop = off;
      markReady();
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [view]);

  const { Root } = view;
  return (
    <MotionConfig reducedMotion="user">
      <Root />
      {view.overlays ? (
        <>
          {/* Past the rail and never wider than the room left of the website preview (the native page view hides whatever overlaps it). */}
          <ToastStack className="bottom-9 left-[calc(var(--rail-w)+12px)] max-w-[calc(100vw-var(--rail-w)-var(--preview-w)-24px)]" />
          <ConfirmDialog />
        </>
      ) : null}
    </MotionConfig>
  );
}
