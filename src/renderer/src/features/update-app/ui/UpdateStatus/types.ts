import type { ReactNode } from 'react';
import type { UpdateStateOf, UpdateStatus } from '@/entities/app-update';

/** One item per status, given its own member: a new UpdateState fails typecheck until it has one. */
export type UpdateStatusItems = { [S in UpdateStatus]: (state: UpdateStateOf<S>) => ReactNode };
