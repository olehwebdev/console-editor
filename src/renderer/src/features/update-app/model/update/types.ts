import type { UpdateState } from '@common/types';
import type { UpdateStateOf, UpdateStatus } from '@/entities/app-update';

/** One handler per status, given its own member: a new UpdateState fails typecheck until it has one. */
export type UpdateStateHandlers = { [S in UpdateStatus]: (state: UpdateStateOf<S>) => void };

/** One handler per status, given its own member and the state it replaces. */
export type UpdateStateChangeHandlers = { [S in UpdateStatus]: (state: UpdateStateOf<S>, prev: UpdateState) => void };
