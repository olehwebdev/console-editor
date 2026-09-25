import { RESPONSE_KIND } from '@common/overrides';
import type { HeldRequest } from '@common/types';
import { responseText } from '@/shared/lib';
import { createTabModel, newTabId, useTabStore } from '@/entities/editor-tab';
import { useHeldStore } from '@/entities/held-request';
import { useSettingsStore } from '@/entities/settings';
import { HELD_BODY } from './constants';
import { findHeldTab } from './findHeldTab';
import { useHeldDrafts } from './useHeldDrafts';

/** Opens a tab for a request a breakpoint just held, in front: its body to edit, and its fields as they came. */
export async function openHeld(held: HeldRequest): Promise<void> {
  const text = await responseText(HELD_BODY[held.stage](held) ?? '', useSettingsStore.getState().settings.autoFormatMinified);
  // Let go while its body was formatted, or opened already.
  if (!useHeldStore.getState().held.some((h) => h.id === held.id) || findHeldTab(held.id)) return;
  useHeldDrafts.getState().set(held.id, { url: held.url, method: held.method, status: String(held.response?.status ?? ''), headers: [], rowKeys: [] });
  const id = newTabId();
  const { lite } = createTabModel(id, held.url, RESPONSE_KIND, text, text);
  useTabStore.getState().add({ id, url: held.url, kind: RESPONSE_KIND, originalHash: null, lite, dirty: false, saving: false, held: held.id });
}
