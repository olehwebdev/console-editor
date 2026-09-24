import type { InterceptionEngine } from '../InterceptionEngine';

export interface AttachedToTarget {
  sessionId: string;
  targetInfo: { targetId: string; type: string; url: string };
  waitingForDebugger: boolean;
}

export interface ChildTarget {
  sessionId: string;
  /** Equal to the iframe's frame id. Chromium may reuse it for a later session of the same frame. */
  targetId: string;
  /** Session that attached it: undefined for the page, else a parent iframe. */
  parentSessionId?: string;
  depth: number;
  engine: InterceptionEngine;
  /** Settles every in-flight command once the session is gone (Chromium never answers them). */
  gone(reason: Error): void;
}
