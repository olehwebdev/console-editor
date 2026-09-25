/**
 * How an update gets installed, once you've asked for it to be downloaded.
 * - auto: on Restart to update (Windows installer, AppImage, .deb, .rpm).
 * - manual: the app downloads and checks it, you install it (macOS until builds are signed
 *   with a Developer ID, which Apple's updater requires; a copy unpacked from .tar.gz).
 */
export type UpdateInstall = 'auto' | 'manual';

export interface AvailableUpdate {
  version: string;
  /** Markdown of what changed (the version's CHANGELOG section); '' when it couldn't be fetched. */
  notes: string;
  /** The release's page on GitHub. */
  releaseUrl: string;
  install: UpdateInstall;
  /**
   * An auto install also happens when the app quits (Windows installer, AppImage). A .deb or .rpm
   * installs only from Restart to update, which asks for a password.
   */
  installsOnQuit: boolean;
}

/** Where the updater is; pushed to the renderer as `update` events. */
export type UpdateState =
  /** Updates don't apply (a build run from source). */
  | { status: 'disabled' }
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'up-to-date'; version: string }
  | { status: 'available'; update: AvailableUpdate }
  | { status: 'downloading'; update: AvailableUpdate; percent: number }
  /** Downloaded: restart to install (auto), or saved at `file` for you to open (manual). */
  | { status: 'ready'; update: AvailableUpdate; file?: string }
  /** A step failed; `update` is still on offer when there was one. */
  | { status: 'error'; during: 'check' | 'download' | 'install'; message: string; update?: AvailableUpdate };

export interface AppInfo {
  version: string;
  /** The version that ran before this one, when the app was just updated; otherwise null. */
  updatedFrom: string | null;
}
