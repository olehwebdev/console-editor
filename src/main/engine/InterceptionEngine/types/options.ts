import type { EngineEvent, Override, Settings, WorkerType } from '../../../../shared/types';
import type { CdpTransport } from '../../cdp';
import type { ServiceWorkerState } from './workers';

export interface EngineOptions {
  transport: CdpTransport;
  /** Current overrides (with content). Called on every intercepted request. */
  getOverrides(): Override[];
  getSettings(): Settings;
  emit(event: EngineEvent): void;
  /** Fetches a URL outside the page (used when the page no longer holds a body). */
  fallbackFetch?(url: string): Promise<string>;
  /**
   * Set for engines attached to a cross-site iframe session: `id` is stamped on
   * its resources and `navigated` events so the UI can scope them to that
   * session, `depth` is the iframe's nesting depth (1 = direct child of the page).
   */
  iframe?: { id: string; depth: number };
  /**
   * Set for engines attached to a worker session. Workers have no Page domain.
   * Dedicated workers and worklets have no Fetch domain either: what they load
   * is paused on the session of the frame that owns them, and only reported
   * (and readable) on theirs.
   */
  worker?: WorkerInfo;
  /**
   * Network requestId -> id of the override that served it, shared by every
   * session of a page: a dedicated worker's requests are paused (and served) on
   * its frame's session but reported on the worker's own.
   */
  servedBy?: Map<string, string>;
  /**
   * While shared workers are being set up, their first script must wait: a
   * worker that starts before its session intercepts never will. Returns
   * undefined when nothing is pending.
   */
  workerSetups?(): Promise<void> | undefined;
}

export interface WorkerInfo {
  /** Session id: stamped on the worker's resources and `worker-detached`. */
  id: string;
  type: WorkerType;
  /** Equal to the Network requestId of the worker's main script. */
  targetId: string;
  /** The worker's script URL (before redirects); a worklet's document URL. */
  url: string;
  /** Started by another worker: Chromium pauses the first script of such a worker nowhere. */
  nested?: boolean;
  /** For a service worker attached again (the page left its site and came back): what its last session knew. */
  previous?: ServiceWorkerState;
}
