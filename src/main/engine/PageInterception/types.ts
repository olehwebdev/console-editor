import type { WorkerType } from '../../../shared/types';
import type { CdpTransport } from '../cdp';
import type { TARGET_TYPE } from '../constants';
import type { EngineOptions, InterceptionEngine } from '../InterceptionEngine';
import type { ChildSessions } from './ChildSessions';
import type { ServiceWorkerRegistry } from './ServiceWorkerRegistry';
import type { SharedWorkers } from './SharedWorkers';

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

export type PageInterceptionOptions = Omit<EngineOptions, 'iframe' | 'worker' | 'servedBy' | 'upstreamSourceMaps' | 'workerSetups'> & { sessions?: SessionObserver };

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
  /** Unsubscribers of what was set up for the session beyond its engine. */
  dispose: Array<() => void>;
  /** A service worker asked to unregister: the next reload installs it afresh. */
  retired?: boolean;
}

/** A live child session, as `PageInterception.targets` lists it. */
export interface TargetSummary {
  targetId: string;
  sessionId: string;
  type: ChildType;
  parentTargetId?: string;
  depth: number;
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

/** A child session's transport, and what fails its commands once the session is gone. */
export interface AbortableTransport {
  transport: CdpTransport;
  /** Rejects every in-flight command, and every later one, with `reason`. */
  gone(reason: Error): void;
}

/** What attaching a child session (an iframe's or a worker's) works with. */
export interface ChildContext {
  /** The page's transport, which carries every session. */
  cdp: CdpTransport;
  opts: PageInterceptionOptions;
  /** What every engine of the page is made with: `opts`, and what the page's sessions share. */
  engineOptions: Omit<EngineOptions, 'transport'>;
  /** The page's own engine. */
  root: InterceptionEngine;
  children: ChildSessions;
  serviceWorkers: ServiceWorkerRegistry;
  sharedWorkers: SharedWorkers;
  /** Whether interception has stopped. */
  stopped(): boolean;
}

/** Subset of `ServiceWorker.workerVersionUpdated` params that we use. */
export interface VersionsUpdated {
  versions: Array<{ registrationId: string; targetId?: string }>;
}

/** Subset of `ServiceWorker.workerRegistrationUpdated` params that we use. */
export interface RegistrationsUpdated {
  registrations: Array<{ registrationId: string; scopeURL: string; isDeleted: boolean }>;
}
