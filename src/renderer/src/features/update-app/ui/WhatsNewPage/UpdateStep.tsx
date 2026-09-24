import type { UpdateStatus } from '../../model/update/types';
import type { UpdateStepProps } from './types';
import { UPDATE_STEPS } from './updateSteps';

/** The card's footer: what comes next for the offered update. Generic so each state reaches its own view without a cast. */
export function UpdateStep<S extends UpdateStatus>({ update, state }: UpdateStepProps<S>) {
  return UPDATE_STEPS[state.status]({ update, state });
}
