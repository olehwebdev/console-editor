import { CHECK_RESULT_REPORTS } from './checkResultReports';
import type { UpdateStateOf, UpdateStatus } from './types';

/** Tells the user what a check came to. Generic so each state reaches its own handler without a cast. */
export function reportCheckResult<S extends UpdateStatus>(state: UpdateStateOf<S>): void {
  CHECK_RESULT_REPORTS[state.status](state);
}
