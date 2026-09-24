import type { CdpTransport } from '../cdp';
import type { EngineOptions, InterceptionEngine } from '../InterceptionEngine';

/**
 * Told about every CDP session interception runs on, to add its own work to them
 * (the console). Its failures never stop interception.
 */
export interface SessionObserver {
  /**
   * A session is set up: the page's own (`id` undefined) once attached, or an
   * iframe's while it is still paused, so nothing it runs is missed. The
   * iframe waits for this, up to the setup timeout.
   */
  attached(id: string | undefined, transport: CdpTransport): Promise<void>;
  /** A session went away (nested ones first); `id` undefined: interception stopped altogether. */
  detached(id: string | undefined): void;
}

export type PageInterceptionOptions = Omit<EngineOptions, 'iframe'> & { sessions?: SessionObserver };

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
