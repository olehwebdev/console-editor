import type { AppEvent } from '../../../shared/types';
import type { FoundBrowser } from '../types';

/** Playwright's WebKit build for this system: where it goes, where it comes from, and its version. */
export interface WebKitBuild {
  directory: string;
  executable: string;
  /** Mirrors, tried in turn. */
  urls: string[];
  version: string | null;
}

/** A browser build the app downloads, as the registry lists it. */
export interface BuiltBrowser {
  browser: FoundBrowser;
  version: string | null;
  downloaded: boolean;
}

export interface WebKitDownloadDeps {
  /** Where builds are kept. */
  dir: string;
  send(event: AppEvent): void;
  /** The build was downloaded or removed. */
  changed(): void;
}
