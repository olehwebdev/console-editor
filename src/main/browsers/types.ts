import type { AppEvent, BrowserEngine } from '../../shared/types';
import type { BrowserStore } from '../store/BrowserStore';
import type { BuiltBrowser } from './webkit';

/** How a browser is started with an address: its program and arguments, and where among them the address goes. */
export interface BrowserCommand {
  command: string[];
  urlAt: number;
}

/** A browser found on this computer, or one the user added, with what the app needs to start it. */
export interface FoundBrowser extends BrowserCommand {
  id: string;
  name: string;
  engine: BrowserEngine;
  /** An image file for its icon (Linux: from its icon theme); null when the system gives one for `app`, or has none. */
  iconFile: string | null;
  /** The app bundle (macOS) or program (Windows) whose icon and version the system gives; null on Linux. */
  app: string | null;
  /** The program itself, when known: asked for its version on Linux. */
  program: string | null;
  added: boolean;
}

export interface BrowserRegistryDeps {
  prefs: BrowserStore;
  /** Pushes an event to the app's windows. */
  send(event: AppEvent): void;
  /** Looks for the installed browsers (the system's own way by default; tests hand their own). */
  find?: () => Promise<FoundBrowser[]>;
  /** The home folder, where everyday profiles are (the user's by default). */
  home?: string;
  /** The browser builds the app downloads (WebKit's), listed as browsers of their own. */
  builds?: { list(): Promise<BuiltBrowser[]> };
}
