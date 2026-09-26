import type { FieldErrors, FieldValues } from 'react-hook-form';

/** A field error's own key that points at its element, not at more errors. */
const REF_KEY = 'ref';

/**
 * The message of a form's first error, in field order (the order its schema reports them in),
 * or undefined when it has none.
 */
export function firstErrorMessage<T extends FieldValues>(errors: FieldErrors<T>): string | undefined {
  for (const [key, error] of Object.entries(errors)) {
    if (key === REF_KEY || !error || typeof error !== 'object') continue;
    if (typeof error.message === 'string' && error.message) return error.message;
    const nested = firstErrorMessage(error as FieldErrors);
    if (nested) return nested;
  }
  return undefined;
}
