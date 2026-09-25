import { validateHeldAction } from '@common/breakpoints';
import { GET_METHOD, graphqlOperation, RESPONSE_KIND } from '@common/overrides';
import { api, errorMessage } from '@/shared/api';
import { TOAST_DURATION } from '@/shared/config';
import { fileName } from '@/shared/lib';
import { toast } from '@/shared/ui/toast';
import { getTabBase, markTabSaved, useTabStore } from '@/entities/editor-tab';
import { useOverrideStore } from '@/entities/override';
import { heldEdits } from './heldEdits';
import { HELD_SEND_ACTIONS } from './heldSendActions';
import { resumeHeld } from './resumeHeld';
import { useHeldDrafts } from './useHeldDrafts';

/**
 * Save as override (a held response): keeps the edited response as a response override for this URL,
 * method and GraphQL operation, answers the page with it, and the tab stays open as the override's.
 */
export async function saveHeldAsOverride(tabId: string): Promise<void> {
  const edits = heldEdits(tabId);
  if (edits?.held.stage !== 'response') return;
  const { tab, held, text, version } = edits;
  const action = HELD_SEND_ACTIONS.response(edits);
  const problem = validateHeldAction(action);
  if (problem) {
    toast({ title: `Can't save ${fileName(held.url)}`, description: problem, tone: 'warning' });
    return;
  }
  const base = getTabBase(tab.id);
  try {
    const created = await api.createOverride({
      kind: RESPONSE_KIND,
      sourceUrl: held.url,
      content: text,
      ...(base !== undefined && base !== text ? { base } : {}),
      originalHash: null,
      request: { method: held.method, operation: graphqlOperation(held.requestBody) ?? '' },
      // Sending anything but a GET again could change data: answered before it is sent from now on.
      response: { status: action.status, delayMs: 0, headers: action.headers, send: held.method === GET_METHOD, patch: false },
    });
    useOverrideStore.getState().upsert(created);
    // The tab is the override's now: letting the request go leaves it open.
    useHeldDrafts.getState().drop(held.id);
    useTabStore.getState().patch(tab.id, { held: undefined, overrideId: created.id });
    markTabSaved(tab.id, version);
  } catch (err) {
    toast({ title: `Could not save ${fileName(held.url)}`, description: errorMessage(err), tone: 'danger' });
    return;
  }
  if (await resumeHeld(held.id, action)) toast({ title: `Saved ${fileName(held.url)}`, description: 'The page got it, and gets it from now on.', tone: 'success', duration: TOAST_DURATION.confirm });
}
