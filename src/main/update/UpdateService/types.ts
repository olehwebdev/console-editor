import type { AvailableUpdate, UpdateState } from '../../../shared/types';

/** The parts of a GitHub release (REST API) the updater reads. */
export interface GitHubRelease {
  tag_name: string;
  html_url: string;
  draft?: boolean;
  prerelease?: boolean;
  assets: Array<{ name: string; browser_download_url: string; size: number }>;
}

/** Installs a release the way this copy was installed (electron-updater: Windows installer, AppImage, .deb, .rpm). */
export interface AutoInstaller {
  /** The version it would install (from the release's latest*.yml), or null when there is none for this system. */
  check(): Promise<string | null>;
  download(onProgress: (percent: number) => void): Promise<void>;
  /** Installs and quits; the app restarts afterwards. Throws when it couldn't install (e.g. the password was refused). */
  quitAndInstall(): void;
  /** Whether quitting after a download installs it too (no password needed). */
  readonly installsOnQuit: boolean;
}

export interface UpdateServiceOptions {
  currentVersion: string;
  platform: NodeJS.Platform;
  arch: 'x64' | 'arm64';
  /** False for builds run from source: nothing is checked. */
  enabled: boolean;
  /** GitHub by default; a local server in tests. */
  endpoints: { latestRelease: string; changelog(version: string): string };
  fetch(url: string, init?: RequestInit): Promise<Response>;
  /** Installs updates for copies that can update themselves; null when you install the download. Asked once. */
  autoInstaller(): Promise<AutoInstaller | null>;
  /** Where manual downloads are saved. */
  downloadsDir: string;
  /** Remembers the last version run, to tell an update apart from a first install. */
  stateFile: string;
  /** The version before this one when the data folder is older than stateFile (0.1.0 kept no record); null on a first run. */
  unrecordedVersion: string | null;
  /** The "Check for updates" setting. */
  autoCheck(): boolean;
  send(state: UpdateState): void;
  /** Saves drafts and lets the window close; false when the user chose to stay. */
  prepareToQuit(): Promise<boolean>;
  /** The app stays after all: closing the window saves drafts again. */
  cancelQuit(): void;
  /** Shows a downloaded file: opens a disk image, reveals anything else. */
  showFile(path: string): Promise<void>;
}

export type UpdateStatus = UpdateState['status'];

/** The member of UpdateState whose `status` is `S`. */
export type UpdateStateOf<S extends UpdateStatus> = Extract<UpdateState, { status: S }>;

/** Reads the update on offer from each state: a new UpdateState fails typecheck until it has a reader. */
export type PendingUpdateReaders = { [S in UpdateStatus]: (state: UpdateStateOf<S>) => AvailableUpdate | null };

/** What a system's manual download is called: `console-editor-<version>-<system>-<arch><ending>`. */
export interface ManualAsset {
  system: string;
  ending: string;
}
