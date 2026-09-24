import { flushSession } from './flushSession';
import { restoreSession } from './restoreSession';
import { startSessionSync } from './startSessionSync';
import type { PageSession } from './types';

/** The session as the event bridge drives it; given to `startBridge`. */
export const pageSession: PageSession = { restore: restoreSession, startSync: startSessionSync, flush: flushSession };
