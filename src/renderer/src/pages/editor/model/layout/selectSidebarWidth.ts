import { fitPanels } from './fitPanels';
import type { Layout } from './types';

export const selectSidebarWidth = (s: Layout) => fitPanels(s).sidebar;
