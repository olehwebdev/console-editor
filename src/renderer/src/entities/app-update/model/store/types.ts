import type { AppInfo, AvailableUpdate, UpdateState } from '@common/types';

export interface UpdateStore {
  /** Mirrors the main process's updater. */
  state: UpdateState;
  /** The running version (and the previous one, right after an update). */
  info: AppInfo | null;
  setState(state: UpdateState): void;
  setInfo(info: AppInfo): void;
}

export type UpdateStatus = UpdateState['status'];

/** The member of UpdateState whose `status` is `S`. */
export type UpdateStateOf<S extends UpdateStatus> = Extract<UpdateState, { status: S }>;

/** One reader per status, given its own member: a new UpdateState fails typecheck until it has one. */
export type OfferedUpdateReaders = { [S in UpdateStatus]: (state: UpdateStateOf<S>) => AvailableUpdate | null };
