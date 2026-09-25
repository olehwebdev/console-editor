import type { ResourceEntry, Settings } from '../../../../shared/types';

/** How a service worker's script was paused, and the override version it was served (`id@updatedAt`, '' for the live file). */
export interface ServedScript {
  resourceType: string;
  version: string;
}

/** What a service worker's session learnt about its installed scripts, kept for its next session. */
export interface ServiceWorkerState {
  url: string;
  installSeen: boolean;
  servedScripts: ReadonlyMap<string, ServedScript>;
  /** Its listed scripts. */
  scripts: ResourceEntry[];
}

/** A CDP command and its params, sent as they are. */
export type CdpCommand = [method: string, params: Record<string, unknown>];

/** What a kind of worker's session offers and takes. */
export interface WorkerSession {
  /**
   * It has a Fetch domain. Dedicated workers and worklets don't: what they
   * load is paused on the session of the frame that owns them.
   */
  fetch: boolean;
  /**
   * Its scripts are paused, and listed from the pause, too. It may start before
   * its session reports anything: a shared worker isn't paused as it starts, and
   * another debugger (DevTools, a test driver) may resume a service worker early.
   */
  pausesScripts: boolean;
  /** The network settings it takes: the page's don't reach what workers load. */
  settings(s: Settings): CdpCommand[];
}

/** What tells why a worker got a file an enabled override matched unmodified. */
export interface MissContext {
  /** The worker was started by another worker. */
  nested: boolean;
  /** The file is the worker's own first script. */
  mainScript: boolean;
  /** The file was paused on the worker's own session (a service worker's). */
  pausedHere: boolean;
}
