import type { SidebarView } from '@/widgets/activity-bar';
import type { SavedLayout } from './types';

/** The editor column never gets narrower than this, so its tabs, header and Save stay usable. */
export const EDITOR_MIN_W = 240;
export const SIDEBAR_W = { min: 220, max: 520 };
export const PREVIEW_RATIO = { min: 0.22, max: 0.72 };
/** The console panel's height: at least `min` px, at most `maxRatio` of the window's. */
export const CONSOLE_H = { min: 96, maxRatio: 0.8 };

/** Where the layout is remembered between runs. */
export const STORAGE_KEY = 'console-editor:layout';

/** The view a first run starts with, and the one Toggle Sidebar brings back. */
export const DEFAULT_SIDEBAR_VIEW: SidebarView = 'explorer';
export const DEFAULTS: SavedLayout = {
  sidebar: DEFAULT_SIDEBAR_VIEW,
  sidebarWidth: 290,
  previewVisible: true,
  previewRatio: 0.42,
  consoleVisible: false,
  consoleHeight: 240,
};
