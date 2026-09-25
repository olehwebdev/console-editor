import { READ_ONLY_MESSAGE } from './constants';
import { isReadOnlyModel } from './isReadOnlyModel';

/**
 * The editor options a model is shown with, as far as editing goes. Every other model gets an
 * explicit `readOnly: false`: the one editor is shared, so an original's setting mustn't stick.
 */
export function readOnlyOptionsFor(model: { uri: { authority: string } } | null): { readOnly: boolean; readOnlyMessage?: { value: string } } {
  return model && isReadOnlyModel(model) ? { readOnly: true, readOnlyMessage: READ_ONLY_MESSAGE } : { readOnly: false };
}
