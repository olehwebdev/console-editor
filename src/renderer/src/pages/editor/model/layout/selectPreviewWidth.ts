import { fitPanels } from './fitPanels';
import type { Layout } from './types';

export const selectPreviewWidth = (s: Layout) => fitPanels(s).preview;
