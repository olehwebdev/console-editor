import type { AppEvent, CaptureArea, DrivenBrowser, DrivenTab } from '../../../shared/types';
import type { PageDesign } from '../../overlay';
import type { CapturedImage, Viewport } from '../../shots/capture';
import type { OverrideStore } from '../../store/OverrideStore';
import type { RuleStore } from '../../store/RuleStore';
import type { SettingsStore } from '../../store/SettingsStore';
import type { FoundBrowser } from '../types';

/** What a driven browser's tabs are served: the active workspace's overrides and rules, and the settings. */
export interface InterceptionSources {
  store: OverrideStore;
  rules: RuleStore;
  settings: SettingsStore;
}

/** A capture of a driven browser's tab, with the address it showed. */
export interface TabCapture {
  image: CapturedImage;
  url: string;
}

/** What a tab's page says of itself: its window (CSS pixels) and density, and its whole document's box, if any. */
export interface PageMetrics {
  window: { width: number; height: number; ratio: number };
  page: { x: number; y: number; width: number; height: number } | null;
}

/** A tab's address and title as read again, each when it could be. */
export interface TabRead {
  id: string;
  url?: string;
  title?: string;
}

/** A tab as a driven browser keeps it: what is listed of it, and whatever its driver needs besides. */
export interface KeptTab {
  info: DrivenTab;
}

/** A browser the app drives, over whichever protocol its engine speaks (CDP for Chromium, WebDriver BiDi for Firefox). */
export interface Driver {
  readonly browser: FoundBrowser;
  /** Attaches to its tabs, the ones open now and every one opened later. */
  start(): Promise<void>;
  list(): DrivenBrowser;
  /** Reads each tab's title and address again. */
  readTabs(): Promise<void>;
  /** Opens an address in its blank tab, or a new one, and brings it to the front. */
  open(url: string): Promise<KeptTab>;
  activate(tabId: string): Promise<void>;
  capture(tabId: string, area: Exclude<CaptureArea, 'element'>): Promise<TabCapture>;
  /** Captures the whole page at `url` (in the tab showing it, or one opened there) laid out in `viewport`. */
  captureAt(url: string, viewport: Viewport): Promise<TabCapture>;
  /** After overrides or rules changed. */
  refresh(): Promise<void>;
  /** After the settings changed. */
  applySettings(): Promise<void>;
  /** Reloads its tabs showing a website. */
  reload(): Promise<void>;
  /** Lays the design over every tab (null: takes it off), and over tabs opened later. */
  setDesign(design: PageDesign | null): Promise<void>;
  /** Stops serving the workspace's changes; the browser stays open. */
  stop(): void;
}

/** How a driver lays the app's design over its tabs. */
export interface TabDesigns<T extends KeptTab> {
  /** Lays `design` over each of `tabs` (null: takes it off), and keeps it for tabs found later. */
  set(design: PageDesign | null, tabs: readonly T[]): Promise<void>;
  /** Lays the design over a tab found since (nothing while there is none). */
  found(tab: T): Promise<void>;
  /** Runs `task` (a capture) with the design off the tab and the page at its own width, then lays it back. */
  hidden<R>(tab: T, task: () => Promise<R>): Promise<R>;
  /** Forgets a tab that closed. */
  gone(tab: T): void;
}

export interface DriverDeps {
  /** How the driver lists itself: its key among the driven browsers, and its name. */
  listedAs: { id: string; name: string; everyday: boolean };
  /** The home folder, where everyday profiles are. */
  home: string;
  sources: InterceptionSources;
  /** The app's data folder, where driven browsers keep their profiles. */
  userData: string;
  /** A tab opened, closed, or changed its address or title. */
  changed(): void;
  /** The browser went away (it was quit). */
  closed(): void;
}

/** Launches (or reaches again) a browser to drive, and starts driving it. */
export type ConnectDriver = (browser: FoundBrowser, deps: DriverDeps) => Promise<Driver>;

/** How a browser is launched to be driven: its flags, and the file in its profile it writes its address in. */
export interface LaunchSpec {
  flags: string[];
  portFile: string;
  /** The address from that file, once written. */
  read(dir: string): Promise<string | null>;
}

export interface DrivenBrowsersDeps {
  /** Where the browsers are found. */
  registry: { get(id: string): Promise<FoundBrowser> };
  sources: InterceptionSources;
  /** The app's data folder, where driven browsers keep their profiles. */
  userData: string;
  /** The home folder, where everyday profiles are (the user's by default). */
  home?: string;
  send(event: AppEvent): void;
}
