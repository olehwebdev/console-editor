import type { WorkerType } from '../../../shared/types';
import type { CdpTransport } from '../cdp';
import type { TARGET_TYPE } from '../constants';
import type { InterceptionEngine } from '../InterceptionEngine';

/** What a child session belongs to: a cross-site iframe or a worker. */
export type ChildType = typeof TARGET_TYPE.iframe | WorkerType;

export interface TargetInfo {
  targetId: string;
  type: string;
  url: string;
  browserContextId?: string;
}

export interface AttachedToTarget {
  sessionId: string;
  targetInfo: TargetInfo;
  waitingForDebugger: boolean;
}

export interface ChildTarget {
  sessionId: string;
  type: ChildType;
  /** Equal to the iframe's frame id. Chromium may reuse it for a later session of the same frame. */
  targetId: string;
  /** Session that attached it: undefined for the page, else a parent iframe or worker. */
  parentSessionId?: string;
  depth: number;
  engine: InterceptionEngine;
  transport: CdpTransport;
  /** Settles every in-flight command once the session is gone (Chromium never answers them). */
  gone(reason: Error): void;
  dispose: Array<() => void>;
  /** A service worker asked to unregister: the next reload installs it afresh. */
  retired?: boolean;
}

/** A shared worker found but not yet intercepting. */
export interface PendingSharedWorker {
  done: Promise<void>;
  settle(): void;
}

/** How a kind of worker's session is set up. */
export interface WorkerSetup {
  /** What messages call it. */
  name: string;
  /** Workers it starts attach through its session (else they'd never run): it gets the auto-attach filter. */
  startsWorkers: boolean;
  /**
   * It can stop and start again on the same session, which reports that (and
   * a first script it didn't fetch) through the Inspector domain.
   */
  inspector: boolean;
}
