import type { monaco } from '../setup';
import { LANGUAGES, LARGE_FILE_CHARS } from './constants';

const LITE = new Set(Object.values(LANGUAGES).map((l) => l.lite));

/** Lite editor options go with a lite language, and with any model that has since grown past the threshold. */
export function isLiteModel(model: Pick<monaco.editor.ITextModel, 'getLanguageId' | 'getValueLength'>): boolean {
  return LITE.has(model.getLanguageId()) || model.getValueLength() >= LARGE_FILE_CHARS;
}
