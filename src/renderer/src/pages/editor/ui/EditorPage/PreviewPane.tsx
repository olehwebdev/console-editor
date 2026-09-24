import { useLayoutEffect, type ReactNode } from 'react';
import { PanelResizer } from '@/shared/ui/panel-resizer';
import { selectPreviewWidth, selectSettledPreviewWidth, useLayout } from '../../model/layout';
import { endResize } from './endResize';
import { startResize } from './startResize';

/** The CSS custom property the preview's width is published as, on the root element. */
const PREVIEW_WIDTH_VAR = '--preview-w';

const { resizePreview } = useLayout.getState();

/**
 * The preview at its fitted width. The width is also published as
 * `--preview-w`, so floating UI anchored to the window (the toast stack) can
 * stay off the native page view.
 */
export function PreviewPane({ children }: { children: ReactNode }) {
  const width = useLayout(selectPreviewWidth);
  // Held while a panel is dragged: a root custom property restyles the whole document, and the view is hidden meanwhile anyway.
  const published = useLayout(selectSettledPreviewWidth);
  useLayoutEffect(() => {
    const root = document.documentElement.style;
    root.setProperty(PREVIEW_WIDTH_VAR, `${published}px`);
    return () => {
      root.removeProperty(PREVIEW_WIDTH_VAR);
    };
  }, [published]);
  return (
    <>
      <PanelResizer aria-label="Resize website preview" onResize={resizePreview} onResizeStart={startResize} onResizeEnd={endResize} />
      <div className="min-w-0 shrink-0 border-l border-line" style={{ width }}>
        {children}
      </div>
    </>
  );
}
