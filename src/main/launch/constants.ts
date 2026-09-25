import { ENV } from '../../shared/constants';

/** What the app keeps in its data folder. */
export const USER_DATA = {
  settings: 'settings.json',
  session: 'session',
  workspace: 'workspace',
  /** Whether the website had a window of its own, and where. */
  pageWindow: 'page-window.json',
  /** The last version run. */
  updateRecord: 'update.json',
  /** Updates downloaded from a local update server (tests). */
  downloads: 'downloads',
} as const;

/** `CONSOLE_EDITOR_GALLERY=1` opens the design-system gallery instead of the editor. */
export const galleryMode = !!process.env[ENV.gallery];
