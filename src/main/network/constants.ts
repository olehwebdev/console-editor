import type { WorkerType } from '../../shared/types';
import { TARGET_TYPE } from '../engine/constants';

/** How often new and changed rows go to the renderer, in ms: a page firing hundreds of requests must not flood IPC. */
export const NETWORK_BATCH_MS = 50;

/** How long reading a body may take: a stopped service worker answers only once it runs again. */
export const READ_TIMEOUT_MS = 5000;

/** Joins a session id and a request id into a row's key: a NUL occurs in neither. */
export const KEY_SEPARATOR = '\u0000';

/** The Network type of a page or frame's document: a new one in the main frame starts a new page load. */
export const DOCUMENT_TYPE = 'Document';

/** What a cancelled request's row says instead of Chromium's `net::ERR_ABORTED`. */
export const CANCELLED = 'Cancelled';

/** Media types whose bodies are text even when Chromium hands them over as base64. */
export const TEXT_MIME = /^text\/|[/+](json|xml|javascript|ecmascript|graphql|x-www-form-urlencoded)\b/i;

/** The target types a session belongs to a worker of, and the kind each is. */
export const WORKER_TARGETS: ReadonlyMap<string, WorkerType> = new Map<string, WorkerType>([
  [TARGET_TYPE.worker, TARGET_TYPE.worker],
  [TARGET_TYPE.sharedWorker, TARGET_TYPE.sharedWorker],
  [TARGET_TYPE.serviceWorker, TARGET_TYPE.serviceWorker],
  [TARGET_TYPE.worklet, TARGET_TYPE.worklet],
]);

/** Where a request's time comes from: CDP gives seconds. */
export const MS_PER_SECOND = 1000;
