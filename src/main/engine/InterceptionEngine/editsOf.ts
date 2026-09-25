import { diffJson, parseJson, type JsonEdit } from '../../../shared/json';
import type { Override } from '../../../shared/types';
import { patchEdits } from './patchEdits';
import type { EngineOptions } from './types';

/** What a patch-mode override changed from the text it was made from: null when either text isn't JSON. */
export function editsOf(override: Override, getBase: EngineOptions['getOverrideBase']): Promise<JsonEdit[] | null> {
  let edits = patchEdits.get(override);
  if (!edits) {
    edits = (async () => {
      try {
        const base = getBase ? await getBase(override.id) : override.content;
        return diffJson(parseJson(base), parseJson(override.content));
      } catch {
        return null;
      }
    })();
    patchEdits.set(override, edits);
  }
  return edits;
}
