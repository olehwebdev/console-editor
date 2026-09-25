import type { HeaderEdit } from '@common/types';
import type { HeaderPreset } from '@/entities/rule';

/** Header rows with a preset's changes added at the end; blank rows (the one a new rule starts with) make way for them. */
export function withPreset(headers: readonly HeaderEdit[], preset: HeaderPreset): HeaderEdit[] {
  return [...headers.filter((edit) => edit.name || edit.value), ...preset.edits.map((edit) => ({ ...edit }))];
}
