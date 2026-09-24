import type { ResourceKind } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { fileName, formatCode, looksMinified } from '@/shared/lib';
import { toast } from '@/shared/ui/toast';
import { createTabModel, newTabId, useTabStore } from '@/entities/editor-tab';
import { findOverrideFor, useOverrideStore } from '@/entities/override';
import { findResource, useResourceStore } from '@/entities/resource';
import { useSettingsStore } from '@/entities/settings';

const opening = new Set<string>();

export interface OpenOptions {
  /** Reuse this tab id (a tab reopened from the last session keeps its id, which names its draft). */
  tabId?: string;
  /** Open without switching to it. Default true. */
  activate?: boolean;
}

function guessKind(url: string): ResourceKind {
  const path = url.split(/[?#]/)[0];
  if (/\.css$/i.test(path)) return 'Stylesheet';
  if (/\.m?js$/i.test(path)) return 'Script';
  return 'Document';
}

/**
 * Opens a file the page loaded. If an override already applies to it, the
 * override opens instead; otherwise the live file is fetched (pretty-printed
 * when minified) into a new, not-yet-saved tab.
 */
export async function openResource(url: string, options: OpenOptions = {}): Promise<void> {
  const { activate = true } = options;
  const entry = findResource(useResourceStore.getState().byKey, url);
  const overrides = Object.values(useOverrideStore.getState().byId);
  const overrideId = entry?.overrideId ?? findOverrideFor(url, overrides)?.id;
  if (overrideId && useOverrideStore.getState().byId[overrideId]) return openOverride(overrideId, options);

  const tabs = useTabStore.getState();
  const existing = tabs.tabs.find((t) => !t.overrideId && t.url === url);
  if (existing) {
    if (activate) tabs.activate(existing.id);
    return;
  }
  if (opening.has(url)) return;

  opening.add(url);
  const pending = toast({ title: `Opening ${fileName(url)}…`, tone: 'neutral', duration: 0 });
  try {
    const res = await api.getResourceContent(url);
    const kind = entry?.kind ?? guessKind(url);
    let text = res.content;
    if (useSettingsStore.getState().settings.autoFormatMinified && looksMinified(text)) {
      toast.update(pending, { title: `Pretty-printing ${fileName(url)}…` });
      text = await formatCode(text, kind).catch(() => text);
    }
    const id = options.tabId ?? newTabId();
    const { lite } = createTabModel(id, url, kind, text, text);
    useTabStore.getState().add({ id, url, kind, originalHash: res.hash, lite, dirty: false, saving: false }, activate);
    toast.dismiss(pending);
  } catch (err) {
    toast.update(pending, { title: `Could not open ${fileName(url)}`, description: errorMessage(err), tone: 'danger', duration: 6000 });
  } finally {
    opening.delete(url);
  }
}

/** Opens an override's served content (its diff base is fetched only if a diff is shown). */
export async function openOverride(id: string, options: OpenOptions = {}): Promise<void> {
  const { activate = true } = options;
  const tabs = useTabStore.getState();
  const existing = tabs.tabs.find((t) => t.overrideId === id);
  if (existing) {
    if (activate) tabs.activate(existing.id);
    return;
  }
  if (opening.has(id)) return;
  opening.add(id);
  try {
    const o = await api.getOverride(id);
    const tabId = options.tabId ?? newTabId();
    const { lite } = createTabModel(tabId, o.sourceUrl, o.kind, o.content);
    useTabStore
      .getState()
      .add({ id: tabId, url: o.sourceUrl, kind: o.kind, overrideId: o.id, originalHash: o.originalHash, lite, dirty: false, saving: false }, activate);
  } catch (err) {
    toast({ title: 'Could not open the override', description: errorMessage(err), tone: 'danger' });
  } finally {
    opening.delete(id);
  }
}
