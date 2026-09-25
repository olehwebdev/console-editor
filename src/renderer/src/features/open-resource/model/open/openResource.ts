import { api, errorMessage } from '@/shared/api';
import { TOAST_DURATION } from '@/shared/config';
import { fileName, formatCode, looksMinified } from '@/shared/lib';
import { toast } from '@/shared/ui/toast';
import { createTabModel, newTabId, useTabStore } from '@/entities/editor-tab';
import { findOverrideFor, useOverrideStore } from '@/entities/override';
import { findResource, useResourceStore } from '@/entities/resource';
import { useSettingsStore } from '@/entities/settings';
import { guessKind } from './guessKind';
import { opening } from './opening';
import { openOverride } from './openOverride';
import type { OpenOptions } from './types';

/**
 * Opens a file the page loaded. If an override already applies to it, the
 * override opens instead; otherwise the live file is fetched (pretty-printed
 * when minified) into a new, not-yet-saved tab. Resolves to the id of the tab
 * opened or found, or null when it didn't open (already opening, or failed).
 */
export async function openResource(url: string, options: OpenOptions = {}): Promise<string | null> {
  const { activate = true } = options;
  const entry = findResource(useResourceStore.getState().byKey, url);
  const overrides = Object.values(useOverrideStore.getState().byId);
  const overrideId = entry?.overrideId ?? findOverrideFor(url, overrides)?.id;
  if (overrideId && useOverrideStore.getState().byId[overrideId]) return openOverride(overrideId, options);

  const tabs = useTabStore.getState();
  const existing = tabs.tabs.find((t) => !t.overrideId && t.url === url);
  if (existing) {
    if (activate) tabs.activate(existing.id);
    return existing.id;
  }
  if (opening.has(url)) return null;

  opening.add(url);
  const pending = toast({ title: `Opening ${fileName(url)}…`, tone: 'neutral', duration: TOAST_DURATION.pending });
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
    return id;
  } catch (err) {
    toast.update(pending, { title: `Could not open ${fileName(url)}`, description: errorMessage(err), tone: 'danger', duration: TOAST_DURATION.danger });
    return null;
  } finally {
    opening.delete(url);
  }
}
