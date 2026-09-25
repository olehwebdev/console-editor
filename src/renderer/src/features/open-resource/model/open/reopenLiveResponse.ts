import { DEFAULT_REQUEST, DEFAULT_RESPONSE, GET_METHOD, RESPONSE_KIND } from '@common/overrides';
import type { SessionTab } from '@common/types';
import { api } from '@/shared/api';
import { responseText } from '@/shared/lib';
import { createTabModel, useTabStore } from '@/entities/editor-tab';
import { useSettingsStore } from '@/entities/settings';

/**
 * Reopens a response tab that was never saved and has no draft (it was opened, not edited): a GET is
 * fetched again, outside the page with its cookies. Any other method isn't: sending it again could
 * change data on the server, so the tab isn't reopened.
 */
export async function reopenLiveResponse(tab: SessionTab): Promise<void> {
  const request = tab.request ?? DEFAULT_REQUEST;
  if (request.method !== GET_METHOD) return;
  const live = await api.getResourceContent(tab.url);
  const text = await responseText(live.content, useSettingsStore.getState().settings.autoFormatMinified);
  const { lite } = createTabModel(tab.id, tab.url, RESPONSE_KIND, text, text);
  useTabStore.getState().add(
    { id: tab.id, url: tab.url, kind: RESPONSE_KIND, originalHash: null, lite, dirty: false, saving: false, request, response: tab.response ?? { ...DEFAULT_RESPONSE, headers: [] } },
    false,
  );
}
