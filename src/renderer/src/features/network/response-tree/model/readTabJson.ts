import { parseJson } from '@common/json';
import { errorMessage } from '@/shared/api';
import { getTabModel } from '@/entities/editor-tab';
import { tabJsonCache } from './tabJsonCache';
import type { TabJson } from './types';

/** What a tab without a model reads as. */
const NO_TEXT: TabJson = { text: '', error: 'This tab has no text.' };

/** A tab's text read as JSON: the same object until its text changes (a store snapshot). */
export function readTabJson(tabId: string): TabJson {
  const model = getTabModel(tabId);
  if (!model) return NO_TEXT;
  const version = model.getAlternativeVersionId();
  const cached = tabJsonCache.get(model);
  if (cached?.version === version) return cached.json;
  const text = model.getValue();
  let json: TabJson;
  try {
    json = { text, root: parseJson(text) };
  } catch (err) {
    json = { text, error: errorMessage(err) };
  }
  tabJsonCache.set(model, { version, json });
  return json;
}
