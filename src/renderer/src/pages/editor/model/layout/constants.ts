import type { SidebarView } from '@/widgets/activity-bar';
import type { SavedLayout } from './types';

/** The editor column never gets narrower than this, so its tabs, header and Save stay usable. */
export const EDITOR_MIN_W = 240;
export const SIDEBAR_W = { min: 220, max: 520 };
export const PREVIEW_RATIO = { min: 0.22, max: 0.72 };

/** Where the layout is remembered between runs. */
export const STORAGE_KEY = 'console-editor:layout';

/** The view a first run starts with, and the one Toggle Sidebar brings back. */
export const DEFAULT_SIDEBAR_VIEW: SidebarView = 'explorer';
export const DEFAULTS: SavedLayout = { sidebar: DEFAULT_SIDEBAR_VIEW, sidebarWidth: 290, previewVisible: true, previewRatio: 0.42 };
