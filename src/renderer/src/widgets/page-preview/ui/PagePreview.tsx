import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api } from '@/shared/api';
import { icons } from '@/shared/config';
import { EASE_OUT, selectAnyOverlayOpen, setNativeViewRect, useOverlayStore } from '@/shared/lib';
import { EmptyState } from '@/shared/ui/empty-state';
import { IconButton } from '@/shared/ui/icon-button';
import { selectHasPage, usePageStore } from '@/entities/page';
import { goBack, goForward, openPageDevTools, reloadPage } from '@/features/navigate-page';
import { AddressBar } from './AddressBar';

const NO_BOUNDS = { x: 0, y: 0, width: 0, height: 0 };

export interface PagePreviewProps {
  /** Hide the native view (e.g. while a panel is being resized: it would swallow the drag). */
  suspended?: boolean;
  addressBarRef?: (el: HTMLInputElement | null) => void;
}

/**
 * The live website. The page itself is a native view that Electron draws over
 * this panel's host box; we keep its bounds in sync, and swap it for a still
 * snapshot while an overlay (palette, menu, dialog) is open.
 */
export function PagePreview({ suspended = false, addressBarRef }: PagePreviewProps) {
  const host = useRef<HTMLDivElement>(null);
  const hasPage = usePageStore(selectHasPage);
  const canGoBack = usePageStore((s) => s.page.canGoBack);
  const canGoForward = usePageStore((s) => s.page.canGoForward);
  const loading = usePageStore((s) => s.page.loading);
  const overlayOpen = useOverlayStore(selectAnyOverlayOpen);
  /** The still shown while frozen: an image, `'unavailable'` if capturing failed, or null while pending. */
  const [snapshot, setSnapshot] = useState<string | 'unavailable' | null>(null);
  const frozen = overlayOpen && hasPage;

  // Once the capture settles the live view gets out of the overlay's way, image or not.
  const hidden = suspended || !hasPage || (frozen && snapshot !== null);

  const sync = useCallback(() => {
    const el = host.current;
    const r = el && hasPage && !suspended ? el.getBoundingClientRect() : undefined;
    const area = r ? { x: r.left, y: r.top, width: r.width, height: r.height } : NO_BOUNDS;
    api.setPageBounds(hidden ? NO_BOUNDS : area);
    // Floating UI can't be drawn over the native view. Reported even while a
    // snapshot stands in for it, so whatever froze the page keeps it frozen.
    setNativeViewRect(area);
  }, [hidden, hasPage, suspended]);

  useLayoutEffect(sync, [sync]);
  useEffect(() => () => setNativeViewRect(null), []);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    window.addEventListener('resize', sync);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, [sync]);

  // Freeze: capture first (the live view keeps showing meanwhile), then swap in the still.
  useEffect(() => {
    if (!frozen) {
      setSnapshot(null);
      return;
    }
    let cancelled = false;
    api
      .capturePage()
      .catch(() => null)
      .then((image) => {
        if (!cancelled) setSnapshot(image ?? 'unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, [frozen]);

  return (
    <section className="flex h-full min-w-0 flex-col bg-surface" aria-label="Website preview">
      <header className="flex h-10 shrink-0 items-center gap-1 border-b border-line px-2">
        <IconButton icon={icons.BackIcon} label="Back" size="sm" disabled={!canGoBack} onClick={() => void goBack()} />
        <IconButton icon={icons.ForwardIcon} label="Forward" size="sm" disabled={!canGoForward} onClick={() => void goForward()} />
        <IconButton
          icon={icons.ReloadIcon}
          label="Reload page"
          shortcut={['mod', 'R']}
          size="sm"
          disabled={!hasPage}
          onClick={() => void reloadPage()}
          className={loading ? '[&_svg]:animate-spin-slow' : undefined}
        />
        <AddressBar inputRef={addressBarRef} className="mx-1" />
        <IconButton icon={icons.DevToolsIcon} label="DevTools for the page" shortcut={['mod', 'shift', 'J']} size="sm" disabled={!hasPage} onClick={() => void openPageDevTools()} />
      </header>

      <div ref={host} className="relative min-h-0 flex-1 bg-white" data-testid="page-host">
        <AnimatePresence>
          {!hasPage ? (
            <motion.div
              key="empty"
              className="absolute inset-0 flex items-center justify-center bg-surface"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
            >
              <EmptyState icon={icons.BrowserIcon} title="The website appears here">
                Type its address above and press Enter. Log in once; sessions are kept.
              </EmptyState>
            </motion.div>
          ) : null}
        </AnimatePresence>
        {frozen && snapshot && snapshot !== 'unavailable' ? (
          <img src={snapshot} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full object-cover object-left-top" />
        ) : null}
        {frozen && snapshot === 'unavailable' ? <div aria-hidden className="absolute inset-0 bg-surface-raised" /> : null}
      </div>
    </section>
  );
}
