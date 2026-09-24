import type { ReactNode } from 'react';
import type { AvailableUpdate } from '@common/types';
import type { UpdateStateOf, UpdateStatus } from '../../model/update/types';

export interface UpdateStepProps<S extends UpdateStatus> {
  update: AvailableUpdate;
  state: UpdateStateOf<S>;
}

/** One view per status, given its own member: a new UpdateState fails typecheck until it has one. */
export type UpdateStepViews = { [S in UpdateStatus]: (props: UpdateStepProps<S>) => ReactNode };
