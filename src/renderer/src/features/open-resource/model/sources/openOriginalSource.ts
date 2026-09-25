import type { SourceMapKind } from '@common/types';
import { languageForPath, requestReveal, type monaco } from '@/shared/monaco';
import { createSourceModel, getTabModel, newTabId, useTabStore } from '@/entities/editor-tab';
import { cleanLabel, parseSourceUrl, sourceKey } from '@/entities/source-map';
import { opening } from '../open/opening';
import { askLoadedMap } from './askLoadedMap';
import { SOURCE_OPEN_KEY_PREFIX } from './constants';
import { isMiss } from './isMiss';
import { toastMiss } from './toastMiss';

export interface OpenSourceOptions {
  /** Open without switching to it. Default true. */
  activate?: boolean;
  /** Where to put the cursor (a jump's target). */
  reveal?: monaco.IPosition;
}

/**
 * Opens an original from a bundle's map, read-only, or switches to it when open. One the map lists
 * without its text opens as a tab that says so; for a jump (with `reveal`), a toast says so instead.
 * Resolves to the tab's id, or null when it didn't open.
 */
export async function openOriginalSource(bundleUrl: string, kind: SourceMapKind, url: string, options: OpenSourceOptions = {}): Promise<string | null> {
  const { activate = true, reveal } = options;
  const tabs = useTabStore.getState();
  const existing = tabs.sources.find((t) => t.bundleUrl === bundleUrl && t.url === url);
  if (existing) {
    const model = getTabModel(existing.id);
    if (reveal && model) requestReveal(model, reveal);
    if (activate) tabs.activate(existing.id);
    return existing.id;
  }
  const key = SOURCE_OPEN_KEY_PREFIX + sourceKey(bundleUrl, url);
  if (opening.has(key)) return null;
  opening.add(key);
  try {
    const { file } = parseSourceUrl(url);
    const reply = await askLoadedMap({ type: 'content', bundleUrl, url }, { kind });
    const tab = { url, bundleUrl, bundleKind: kind };
    if (isMiss(reply)) {
      if (reply.miss !== 'no-content' || reveal) {
        toastMiss(reply.miss, { bundle: parseSourceUrl(bundleUrl).file, file, line: reveal?.lineNumber });
        return null;
      }
      const id = newTabId();
      useTabStore.getState().openSource({ ...tab, id, languageName: languageForPath(file, 0).name, lite: false, missing: true }, activate);
      return id;
    }
    const language = languageForPath(file, reply.content.length);
    const id = newTabId();
    createSourceModel(id, cleanLabel(file.split('?')[0]!) || file, language.id, reply.content);
    const model = getTabModel(id);
    if (reveal && model) requestReveal(model, reveal);
    useTabStore.getState().openSource({ ...tab, id, languageName: language.name, lite: language.lite, missing: false }, activate);
    return id;
  } finally {
    opening.delete(key);
  }
}
