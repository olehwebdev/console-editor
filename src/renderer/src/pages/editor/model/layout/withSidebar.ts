import type { SidebarView } from '@/widgets/activity-bar';
import type { Layout } from './types';

/** Shows `sidebar` (null hides it); a hidden one keeps its room until `sidebarExited`. */
export const withSidebar = (s: Layout, sidebar: SidebarView | null) => ({ sidebar, sidebarLeaving: !sidebar && (s.sidebarLeaving || !!s.sidebar) });
