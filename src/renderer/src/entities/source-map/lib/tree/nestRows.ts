import { fileName } from '@/shared/lib';
import type { SourceMapState } from '../../model/store';
import { describeFailure } from '../describeFailure';
import { readySourceRows } from './readySourceRows';
import { statusRow } from './statusRow';
import type { NestInput, SourceRow } from './types';

/** What a bundle's nest shows in each state of its map: a new status fails typecheck until it's decided here. */
export const NEST_ROWS: { [S in SourceMapState['status']]: (state: Extract<SourceMapState, { status: S }>, input: NestInput) => SourceRow[] } = {
  loading: (_state, input) => statusRow(input, 'loading', 'Reading the source map…'),
  // The Explorer gives a file known to have no map no nest to open.
  none: () => [],
  failed: ({ failure, detail }, input) => statusRow(input, 'failed', describeFailure(failure, detail, fileName(input.bundleUrl))),
  ready: readySourceRows,
};
