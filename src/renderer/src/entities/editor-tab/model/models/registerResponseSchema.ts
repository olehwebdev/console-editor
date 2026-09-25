import { inferJsonSchema } from '@/shared/lib';
import { type monaco, setModelSchema } from '@/shared/monaco';

/**
 * Gives a response tab's JSON the keys and types of `sample` (its live response): completion offers
 * them, and a value of another type is a warning. Returns the URI it is kept under, to clear with the
 * tab; a sample that isn't JSON gives no schema.
 */
export function registerResponseSchema(model: monaco.editor.ITextModel, sample: string): string | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(sample);
  } catch {
    return undefined;
  }
  const uri = model.uri.toString();
  setModelSchema(uri, inferJsonSchema(parsed));
  return uri;
}
