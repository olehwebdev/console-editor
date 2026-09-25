import { CONTROL_CHARACTERS, MAX_SELECTOR_LENGTH, MAX_SELECTOR_ROOTS } from '../constants';

/** The selectors the adapter gave for an element (one per root it is in), checked: strings, not too many or too long; else null. */
export function toSelector(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || !raw.length || raw.length > MAX_SELECTOR_ROOTS) return null;
  if (!raw.every((step): step is string => typeof step === 'string' && !!step && step.length <= MAX_SELECTOR_LENGTH)) return null;
  return raw.map((step) => step.replace(CONTROL_CHARACTERS, ''));
}
