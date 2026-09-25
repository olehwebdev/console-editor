import type { HeldAction, HeldActionType, HeldRequest } from '../../../../shared/types';
import type { PausedRequest } from '../../rules';
import type { RequestPausedParams } from './cdp';
import type { PausedRequestContext } from './tracking';

/** What the engine tells the page's held requests about one it stopped (the registry gives it an id and a time). */
export type HoldInput = Omit<HeldRequest, 'id' | 'heldAt'> & {
  /** Its `Network` request id, for the Network panel's row. */
  networkId?: string;
};

/** Does what the user chose for a held request; true once it is answered, false to let it go on as it would have. */
export type HeldActionApplier<A extends HeldAction> = (ctx: PausedRequestContext, p: RequestPausedParams, action: A, request: PausedRequest) => Promise<boolean>;

/** One applier per kind of action: a new kind fails typecheck until it has one. */
export type HeldActionAppliers = { [T in HeldActionType]: HeldActionApplier<Extract<HeldAction, { type: T }>> };
