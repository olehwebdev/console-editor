import type { SessionDraft, SessionTab } from '@common/types';
import { api } from '@/shared/api';
import {
  createTabModel,
  getTabBase,
  getTabModel,
  onTabEdited,
  replaceTabText,
  useTabStore,
  type TabMeta,
} from '@/entities/editor-tab';
import { useOverrideStore } from '@/entities/override';
import { openOverride, openResource } from '@/features/open-resource';

/*
 * Session restore: the open tabs, and the unsaved text of each (a "draft"),
 * are written to disk as they change, and reopened on the next start. The
 * page URL is remembered by the main process itself.
 */

const TABS_DELAY_MS = 300;
/** Drafts can be megabytes: written once typing pauses, and always on close. */
const DRAFT_DELAY_MS = 800;

let syncing = false;
let tabsTimer: ReturnType<typeof setTimeout> | undefined;
const draftTimers = new Map<string, ReturnType<typeof setTimeout>>();
/** Tabs with a draft on disk. */
const drafted = new Set<string>();
/** Tabs whose draft base (for tabs not yet saved as overrides) is on disk. */
const baseWritten = new Set<string>();
/** Writes in flight, so closing can wait for them. */
const writes = new Set<Promise<unknown>>();
/** Tabs whose last draft write failed, and whether the last tab-list write did: retried on close. */
const failedDrafts = new Set<string>();
let tabsFailed = false;

function track(write: Promise<unknown>): void {
  writes.add(write);
  const done = () => writes.delete(write);
  write.then(done, done);
}

function toSessionTab(tab: TabMeta): SessionTab {
  return {
    id: tab.id,
    url: tab.url,
    kind: tab.kind,
    ...(tab.overrideId ? { overrideId: tab.overrideId } : {}),
    originalHash: tab.originalHash,
  };
}

async function reopen(tab: SessionTab): Promise<void> {
  const draft = await api.getDraft(tab.id).catch(() => null);
  if (tab.overrideId && useOverrideStore.getState().byId[tab.overrideId]) {
    await openOverride(tab.overrideId, { tabId: tab.id, activate: false });
  } else if (draft) {
    // Everything this tab needs is on disk: no need for the network.
    const base = draft.base ?? draft.content;
    const { lite } = createTabModel(tab.id, tab.url, tab.kind, base, base);
    useTabStore
      .getState()
      .add({ id: tab.id, url: tab.url, kind: tab.kind, originalHash: tab.originalHash, lite, dirty: false, saving: false }, false);
  } else {
    await openResource(tab.url, { tabId: tab.id, activate: false });
  }
  if (draft && getTabModel(tab.id)) {
    // One undoable edit on top of the saved text, so the tab shows as unsaved and undo reveals what changed.
    replaceTabText(tab.id, draft.content);
    drafted.add(tab.id);
    if (draft.base !== undefined) baseWritten.add(tab.id);
  }
}

/** Reopens the tabs (and their unsaved edits) of the last run. */
export async function restoreSession(): Promise<void> {
  const session = await api.getSession();
  for (const tab of session.tabs) await reopen(tab).catch(() => undefined);
  const { tabs, activate } = useTabStore.getState();
  const active = tabs.find((t) => t.id === session.activeTabId) ?? tabs.at(-1);
  if (active) activate(active.id);
}

function saveTabs(): void {
  clearTimeout(tabsTimer);
  tabsTimer = undefined;
  const { tabs, activeId } = useTabStore.getState();
  track(
    api.saveSessionTabs(tabs.map(toSessionTab), activeId).then(
      () => {
        tabsFailed = false;
      },
      (err: unknown) => {
        tabsFailed = true;
        throw err;
      },
    ),
  );
}

function saveDraft(tabId: string): void {
  clearTimeout(draftTimers.get(tabId));
  draftTimers.delete(tabId);
  const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
  const model = getTabModel(tabId);
  if (!tab?.dirty || !model) return;
  const draft: SessionDraft = { content: model.getValue() };
  if (!tab.overrideId && !baseWritten.has(tabId)) {
    const base = getTabBase(tabId);
    if (base !== undefined) draft.base = base;
    baseWritten.add(tabId);
  }
  drafted.add(tabId);
  track(
    api.saveDraft(tabId, draft).then(
      () => failedDrafts.delete(tabId),
      (err: unknown) => {
        failedDrafts.add(tabId);
        // Written again in full next time (the base too, if it was part of this one).
        if (draft.base !== undefined) baseWritten.delete(tabId);
        throw err;
      },
    ),
  );
}

function dropDraft(tabId: string): void {
  clearTimeout(draftTimers.get(tabId));
  draftTimers.delete(tabId);
  baseWritten.delete(tabId);
  failedDrafts.delete(tabId);
  if (drafted.delete(tabId)) track(api.deleteDraft(tabId));
}

/**
 * Keeps the session on disk in step with the tabs. Start it after
 * `restoreSession`, so the empty tab list of a fresh start never overwrites
 * the one being restored.
 */
export function startSessionSync(): () => void {
  syncing = true;
  const key = (tabs: TabMeta[], activeId: string | null) =>
    JSON.stringify([tabs.map((t) => [t.id, t.url, t.kind, t.overrideId, t.originalHash]), activeId]);
  let last = key(useTabStore.getState().tabs, useTabStore.getState().activeId);

  const offTabs = useTabStore.subscribe((s) => {
    // Saved, undone back to the saved text, or closed: the draft is obsolete.
    for (const id of drafted) {
      const tab = s.tabs.find((t) => t.id === id);
      if (!tab?.dirty) dropDraft(id);
    }
    const next = key(s.tabs, s.activeId);
    if (next === last) return;
    last = next;
    clearTimeout(tabsTimer);
    tabsTimer = setTimeout(saveTabs, TABS_DELAY_MS);
  });

  const offEdits = onTabEdited((tabId) => {
    const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
    if (!tab?.dirty) return;
    clearTimeout(draftTimers.get(tabId));
    draftTimers.set(tabId, setTimeout(() => saveDraft(tabId), DRAFT_DELAY_MS));
  });

  return () => {
    syncing = false;
    offTabs();
    offEdits();
  };
}

/** Writes everything still pending (the window is closing). Resolves false if something could not be written. */
export async function flushSession(): Promise<boolean> {
  if (syncing) {
    if (tabsTimer || tabsFailed) saveTabs();
    for (const tabId of new Set([...draftTimers.keys(), ...failedDrafts])) saveDraft(tabId);
  }
  const results = await Promise.allSettled([...writes]);
  return results.every((r) => r.status === 'fulfilled');
}
