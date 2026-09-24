import type { UpdateState } from '@common/types';

export type UpdateStatus = UpdateState['status'];

/** The member of UpdateState whose `status` is `S`. */
export type UpdateStateOf<S extends UpdateStatus> = Extract<UpdateState, { status: S }>;

/** One handler per status, given its own member: a new UpdateState fails typecheck until it has one. */
export type UpdateStateHandlers = { [S in UpdateStatus]: (state: UpdateStateOf<S>) => void };

/** One handler per status, given its own member and the state it replaces. */
export type UpdateStateChangeHandlers = { [S in UpdateStatus]: (state: UpdateStateOf<S>, prev: UpdateState) => void };
