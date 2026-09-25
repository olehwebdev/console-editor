import type { HeaderEdit } from '@common/types';

/** A named set of header changes a header rule can start from. */
export interface HeaderPreset {
  label: string;
  edits: readonly HeaderEdit[];
}
