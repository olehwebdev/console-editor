import { DEFAULT_RESPONSE, GET_METHOD, RESPONSE_KIND } from '@common/overrides';
import type { NetworkRequest } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { TOAST_DURATION } from '@/shared/config';
import { responseText } from '@/shared/lib';
import { toast } from '@/shared/ui/toast';
import { createTabModel, newTabId, useTabStore } from '@/entities/editor-tab';
import { findResponseOverride, useOverrideStore } from '@/entities/override';
import { useSettingsStore } from '@/entities/settings';
import { BODY_GAP_TEXT } from './constants';
import { opening } from './opening';
import { openOverride } from './openOverride';

/**
 * Opens a request's response for editing (Override response). The override that answers it opens
 * instead, if there is one; otherwise the response the page got opens in a new, unsaved tab, which
 * saving turns into a response override matching this URL, method and GraphQL operation.
 */
export async function openResponse(request: NetworkRequest): Promise<void> {
  const { byId } = useOverrideStore.getState();
  const answering = (request.overrideId ? byId[request.overrideId] : undefined) ?? findResponseOverride(request, Object.values(byId));
  if (answering) {
    await openOverride(answering.id);
    return;
  }

  const operation = request.operation ?? '';
  const tabs = useTabStore.getState();
  const existing = tabs.tabs.find((t) => !t.overrideId && t.kind === RESPONSE_KIND && t.url === request.url && t.request?.method === request.method && t.request.operation === operation);
  if (existing) return tabs.activate(existing.id);
  if (opening.has(request.id)) return;

  opening.add(request.id);
  try {
    const body = await api.getNetworkResponseBody(request.id);
    if (!body.available || body.binary) {
      toast({ title: "Can't open this response", description: body.available ? 'It is binary, not text.' : BODY_GAP_TEXT[body.gap], tone: 'warning', duration: TOAST_DURATION.normal });
      return;
    }
    const text = await responseText(body.text, useSettingsStore.getState().settings.autoFormatMinified);
    const id = newTabId();
    const { lite } = createTabModel(id, request.url, RESPONSE_KIND, text, text);
    useTabStore.getState().add({
      id,
      url: request.url,
      kind: RESPONSE_KIND,
      originalHash: null,
      lite,
      dirty: false,
      saving: false,
      request: { method: request.method, operation },
      // Sending anything but a GET again could change data: answered before it is sent until told otherwise.
      response: { ...DEFAULT_RESPONSE, headers: [], send: request.method === GET_METHOD },
    });
  } catch (err) {
    toast({ title: "Can't open this response", description: errorMessage(err), tone: 'danger' });
  } finally {
    opening.delete(request.id);
  }
}
