import type { BrowserWindow } from 'electron';
import type { PageController } from '../PageController';

/** Shared by createWindow and handOver. Mutated in place (importers can't reassign another module's bindings). */
export const launchState: {
  /** The open window, for a second launch to hand over to. */
  running: { win: BrowserWindow; page: PageController } | undefined;
  /** Set once the first page load has been chosen; a URL handed over before that replaces it. */
  started: boolean;
  handedUrl: string | undefined;
} = { running: undefined, started: false, handedUrl: undefined };
