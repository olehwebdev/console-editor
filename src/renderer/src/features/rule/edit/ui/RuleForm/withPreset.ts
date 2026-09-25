import type { HeaderEdit } from '@common/types';
import { type HeaderPreset, nextRowKey } from '@/entities/rule';

/** Header rows with a preset's changes added at the end; blank rows (the one a new rule starts with) make way for them. */
export function withPreset(headers: readonly HeaderEdit[], rowKeys: readonly string[], preset: HeaderPreset): { headers: HeaderEdit[]; rowKeys: string[] } {
  const kept = headers.flatMap((edit, i) => (edit.name || edit.value ? [{ edit, key: rowKeys[i] }] : []));
  return {
    headers: [...kept.map((row) => row.edit), ...preset.edits.map((edit) => ({ ...edit }))],
    rowKeys: [...kept.map((row) => row.key), ...preset.edits.map(() => nextRowKey())],
  };
}
