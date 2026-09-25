import { selectAnyOverlayOpen, useOverlayStore } from '@/shared/lib';
import { selectHasPage, usePageStore } from '@/entities/page';
import { EmptyPreview } from './EmptyPreview';
import { PageSnapshot } from './PageSnapshot';
import { PreviewToolbar } from './PreviewToolbar';
import type { PagePreviewProps } from './types';
import { useNativeViewHost } from './useNativeViewHost';
import { usePageSnapshot } from './usePageSnapshot';

/**
 * The live website. The page itself is a native view that Electron draws over
 * this panel's host box; we keep its bounds in sync, and swap it for a still
 * snapshot while an overlay (palette, menu, dialog) is open.
 */
export function PagePreview({ suspended = false, layoutKey, addressBarRef }: PagePreviewProps) {
  const hasPage = usePageStore(selectHasPage);
  const overlayOpen = useOverlayStore(selectAnyOverlayOpen);
  const frozen = overlayOpen && hasPage;
  const snapshot = usePageSnapshot(frozen);

  // Once the capture settles the live view gets out of the overlay's way, image or not.
  const hidden = suspended || !hasPage || (frozen && snapshot !== null);
  const host = useNativeViewHost({ hidden, hasPage, suspended, layoutKey });

  return (
    <section className="flex h-full min-w-0 flex-col bg-surface" aria-label="Website preview">
      <PreviewToolbar hasPage={hasPage} addressBarRef={addressBarRef} />

      <div ref={host} className="relative min-h-0 flex-1 bg-white" data-testid="page-host">
        <EmptyPreview hasPage={hasPage} />
        {frozen ? <PageSnapshot snapshot={snapshot} /> : null}
      </div>
    </section>
  );
}
