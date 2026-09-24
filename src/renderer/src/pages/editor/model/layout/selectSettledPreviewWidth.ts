import { fitPanels } from './fitPanels';
import type { Layout } from './types';

/** The preview's width, held at where it was while a panel is dragged. */
export const selectSettledPreviewWidth = (s: Layout) => s.dragStart?.preview ?? fitPanels(s).preview;
