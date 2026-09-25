import type { HeldAction } from '../../../shared/types';
import { CDP } from '../constants';
import type { HeldActionApplier } from './types';

/** Fails the held request with the network error the user picked. */
export const failHeld: HeldActionApplier<Extract<HeldAction, { type: 'fail' }>> = async ({ cdp }, p, { reason }) => {
  await cdp.send(CDP.Fetch.failRequest, { requestId: p.requestId, errorReason: reason });
  return true;
};
