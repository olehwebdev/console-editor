import type { SourceMapState } from '../../model/store';
import { NEST_ROWS } from './nestRows';
import { statusRow } from './statusRow';
import type { NestInput, SourceRow } from './types';

/**
 * The rows of a bundle's open nest, from its map's state (`undefined` when the store no longer holds
 * it). Generic so each state reaches its own rows without a cast.
 */
export function buildSourceRows<S extends SourceMapState['status']>(input: NestInput, state: Extract<SourceMapState, { status: S }> | undefined): SourceRow[] {
  if (!state) return statusRow(input, 'unloaded', 'Read the source map');
  return NEST_ROWS[state.status](state, input);
}
