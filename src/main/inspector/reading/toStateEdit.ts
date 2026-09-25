import { STATE_KINDS, type StateKind } from '../../../shared/types';
import { MAX_STATE_JSON, MAX_TEXT_LENGTH, NOT_JSON, NOT_SETTABLE } from '../constants';

/** A state edit from the renderer, checked, with its JSON read: what the adapter's `set` is given. */
export function toStateEdit(raw: unknown): { kind: StateKind; name: string; value: unknown } {
  const edit = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const kind = STATE_KINDS.find((k) => k === edit.kind);
  if (!kind || typeof edit.name !== 'string' || !edit.name || edit.name.length > MAX_TEXT_LENGTH) throw new Error(NOT_SETTABLE);
  if (typeof edit.json !== 'string' || edit.json.length > MAX_STATE_JSON) throw new Error(NOT_JSON);
  try {
    return { kind, name: edit.name, value: JSON.parse(edit.json) as unknown };
  } catch {
    throw new Error(NOT_JSON);
  }
}
