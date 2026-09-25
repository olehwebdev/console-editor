import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OverrideMeta, Rule, SessionDraft, SessionState, Workspace, WorkspacesState } from '../../src/shared/types';
import { closeSessionTabs, flushSession, pageSession, restoreSession, startSessionSync } from '@/pages/editor/model/session';
import { createWorkspace, deleteWorkspace, switchWorkspace } from '@/pages/editor/model/workspaces';
import { createTabModel, disposeTabModel, getTabModel, markTabSaved, newTabId, useTabStore } from '@/entities/editor-tab';
import { useOverrideStore } from '@/entities/override';
import { useRuleStore } from '@/entities/rule';
import { useWorkspaceStore } from '@/entities/workspace';

/** Just enough of a Monaco text model: text, an alternative version id, change listeners. */
const { FakeModel } = vi.hoisted(() => {
  class FakeModel {
    disposed = false;
    private version = 1;
    private listeners = new Set<() => void>();
    constructor(private text: string) {}
    getValue() {
      return this.text;
    }
    getValueLength() {
      return this.text.length;
    }
    getAlternativeVersionId() {
      return this.version;
    }
    /** Stands in for the user typing. */
    type(text: string) {
      this.text = text;
      this.version++;
      this.listeners.forEach((l) => l());
    }
    onDidChangeContent(listener: () => void) {
      this.listeners.add(listener);
      return { dispose: () => this.listeners.delete(listener) };
    }
    pushStackElement() {}
    pushEditOperations(_: unknown, ops: { text: string }[]) {
      this.type(ops[0].text);
      return null;
    }
    getFullModelRange() {
      return {};
    }
    dispose() {
      this.disposed = true;
    }
  }
  return { FakeModel };
});

const api = vi.hoisted(() => ({
  getSession: vi.fn<() => Promise<SessionState>>(),
  getDraft: vi.fn<(id: string) => Promise<SessionDraft | null>>(),
  saveSessionTabs: vi.fn(async () => {}),
  saveDraft: vi.fn(async () => {}),
  deleteDraft: vi.fn(async () => {}),
  getOverride: vi.fn(),
  getResourceContent: vi.fn(),
  getWorkspaces: vi.fn<() => Promise<WorkspacesState>>(),
  listOverrides: vi.fn(async (): Promise<OverrideMeta[]> => []),
  listRules: vi.fn(async (): Promise<Rule[]> => []),
  switchWorkspace: vi.fn(async (_id: string) => {}),
  createWorkspace: vi.fn<() => Promise<Workspace>>(),
  deleteWorkspace: vi.fn(async (_id: string) => {}),
}));
const toast = vi.hoisted(() => Object.assign(vi.fn(() => 'toast-1'), { dismiss: vi.fn(), update: vi.fn() }));
const confirm = vi.hoisted(() => vi.fn(async (_options: { title: string }) => true));

vi.mock('@/shared/api', () => ({ api, onAppEvent: () => () => {}, errorMessage: (err: unknown) => String(err) }));
vi.mock('@/shared/ui/toast', () => ({ toast }));
vi.mock('@/shared/ui/dialog', () => ({ confirm, isConfirmOpen: () => false }));
vi.mock('@/shared/monaco', () => ({
  monaco: { editor: { createModel: (text: string) => new FakeModel(text) }, Uri: { from: () => ({}) } },
  languageFor: () => 'javascript',
  editorHasFocus: () => false,
  dismissEditorWidgets: () => {},
  triggerInActiveEditor: () => {},
}));

type Model = InstanceType<typeof FakeModel>;
const model = (id: string) => getTabModel(id) as unknown as Model;
const tick = () => new Promise((r) => setTimeout(r, 0));

const override: OverrideMeta = {
  id: 'o1',
  kind: 'Script',
  sourceUrl: 'https://site.test/app.js',
  match: { type: 'exact', pattern: 'https://site.test/app.js', ignoreQuery: false },
  enabled: true,
  originalHash: 'h0',
  createdAt: 0,
  updatedAt: 0,
};

const workspace = (id: string, host: string): Workspace => ({ id, name: '', host, title: '', icon: 'favicon', color: 'ember' });
const workspaces = [workspace('wsa00000', 'site.test'), workspace('wsb00000', 'other.test')];

let stopSync: (() => void) | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  // Forgets the previous test's tabs and drafts (without deleting anything).
  closeSessionTabs();
  for (const t of useTabStore.getState().tabs) disposeTabModel(t.id);
  useTabStore.setState({ tabs: [], pages: [], activeId: null, diff: 'off' });
  useOverrideStore.getState().setAll([override]);
  useWorkspaceStore.setState({ workspaces, activeId: 'wsa00000', favicons: {}, switchingTo: null });
});

afterEach(() => {
  stopSync?.();
  stopSync = undefined;
  vi.useRealTimers();
});

describe('session restore', () => {
  it('reopens override and live tabs with their unsaved edits, and the active tab', async () => {
    api.getSession.mockResolvedValue({
      url: 'https://site.test/',
      tabs: [
        { id: 'tab-a', url: override.sourceUrl, kind: 'Script', overrideId: 'o1', originalHash: 'h0' },
        { id: 'tab-b', url: 'https://site.test/lib.js', kind: 'Script', originalHash: 'h1' },
        { id: 'tab-c', url: 'https://site.test/clean.js', kind: 'Script', originalHash: 'h2' },
      ],
      activeTabId: 'tab-b',
    });
    api.getDraft.mockImplementation(async (id) =>
      id === 'tab-a' ? { content: 'override draft' } : id === 'tab-b' ? { content: 'live draft', base: 'live base' } : null,
    );
    api.getOverride.mockResolvedValue({ ...override, content: 'saved override' });
    api.getResourceContent.mockResolvedValue({ url: 'https://site.test/clean.js', content: 'clean();', hash: 'h2' });

    await restoreSession();

    const { tabs, activeId } = useTabStore.getState();
    expect(tabs.map((t) => [t.id, t.dirty])).toEqual([['tab-a', true], ['tab-b', true], ['tab-c', false]]);
    expect(activeId).toBe('tab-b');
    expect(model('tab-a').getValue()).toBe('override draft');
    expect(model('tab-b').getValue()).toBe('live draft');
    // The live tab with a draft needed no network: its base came from disk.
    expect(api.getResourceContent).toHaveBeenCalledTimes(1);
    expect(tabs.find((t) => t.id === 'tab-b')?.originalHash).toBe('h1');
    // Undo reveals the saved text under the draft.
    expect(model('tab-c').getValue()).toBe('clean();');
  });
});

describe('session sync', () => {
  function openTab(overrideId?: string) {
    const id = newTabId();
    const url = `https://site.test/${id}.js`;
    createTabModel(id, url, 'Script', 'base();', overrideId ? undefined : 'base();');
    useTabStore.getState().add({ id, url, kind: 'Script', overrideId, originalHash: null, lite: false, dirty: false, saving: false });
    return id;
  }

  it('writes the tab list once changes settle, and drafts once typing pauses (the base only once)', async () => {
    vi.useFakeTimers();
    stopSync = startSessionSync();
    const id = openTab();
    await vi.advanceTimersByTimeAsync(400);
    expect(api.saveSessionTabs).toHaveBeenCalledTimes(1);
    expect(api.saveSessionTabs).toHaveBeenLastCalledWith('wsa00000', [expect.objectContaining({ id, url: `https://site.test/${id}.js` })], id);

    model(id).type('edit 1');
    model(id).type('edit 2');
    await vi.advanceTimersByTimeAsync(900);
    expect(api.saveDraft).toHaveBeenCalledTimes(1);
    expect(api.saveDraft).toHaveBeenLastCalledWith(id, { content: 'edit 2', base: 'base();' });
    model(id).type('edit 3');
    await vi.advanceTimersByTimeAsync(900);
    expect(api.saveDraft).toHaveBeenLastCalledWith(id, { content: 'edit 3' });
  });

  it('keeps the file tab that was in front while a page tab (What’s New) is', async () => {
    vi.useFakeTimers();
    stopSync = startSessionSync();
    const a = openTab();
    openTab();
    useTabStore.getState().activate(a);
    await vi.advanceTimersByTimeAsync(400);
    api.saveSessionTabs.mockClear();
    useTabStore.getState().openPage({ id: 'page:whats-new', page: 'whats-new', title: "What's New" });
    await vi.advanceTimersByTimeAsync(400);
    // Nothing to write: the tabs and the file in front are the same.
    expect(api.saveSessionTabs).not.toHaveBeenCalled();
    // A tab opened behind the page is written with the file that was in front.
    const id = newTabId();
    createTabModel(id, `https://site.test/${id}.js`, 'Script', 'x', 'x');
    useTabStore.getState().add({ id, url: `https://site.test/${id}.js`, kind: 'Script', originalHash: null, lite: false, dirty: false, saving: false }, false);
    await vi.advanceTimersByTimeAsync(400);
    expect(api.saveSessionTabs).toHaveBeenLastCalledWith('wsa00000', expect.any(Array), a);
  });

  it('deletes the draft once the tab is saved, or closed', async () => {
    vi.useFakeTimers();
    stopSync = startSessionSync();
    const id = openTab('o1');
    model(id).type('changed');
    await vi.advanceTimersByTimeAsync(900);
    expect(api.saveDraft).toHaveBeenCalledWith(id, { content: 'changed' });
    markTabSaved(id, model(id).getAlternativeVersionId());
    expect(api.deleteDraft).toHaveBeenCalledWith(id);

    const other = openTab();
    model(other).type('x');
    await vi.advanceTimersByTimeAsync(900);
    useTabStore.getState().remove(other);
    expect(api.deleteDraft).toHaveBeenCalledWith(other);
  });

  it('on close, writes what is still pending and reports failures', async () => {
    stopSync = startSessionSync();
    const id = openTab();
    model(id).type('typed just before closing');
    expect(await flushSession()).toBe(true);
    expect(api.saveSessionTabs).toHaveBeenCalled();
    expect(api.saveDraft).toHaveBeenCalledWith(id, { content: 'typed just before closing', base: 'base();' });

    api.saveDraft.mockRejectedValueOnce(new Error('disk full'));
    model(id).type('again');
    expect(await flushSession()).toBe(false);
    // Retried on the next close (the base is already on disk from the first write).
    expect(await flushSession()).toBe(true);
    expect(api.saveDraft).toHaveBeenLastCalledWith(id, { content: 'again' });
    await tick();
  });

  it('on close, reports unapplied rule edits as not kept, so closing asks first', async () => {
    stopSync = startSessionSync();
    const input = { action: 'block' as const, match: { type: 'glob' as const, pattern: 'https://a.test/*', ignoreQuery: true }, resourceTypes: [] };
    useTabStore.getState().openPage({ id: 'page:rule:r1', page: 'rule', ruleId: 'r1', title: 'r1' });
    expect(await pageSession.flush()).toBe(true);

    useTabStore.getState().setPageDraft('page:rule:r1', { base: input, value: { ...input, resourceTypes: ['Script'] }, rowKeys: [] });
    expect(await pageSession.flush()).toBe(false);
  });
});

describe('switching workspaces', () => {
  function openTab() {
    const id = newTabId();
    const url = `https://site.test/${id}.js`;
    createTabModel(id, url, 'Script', 'base();', 'base();');
    useTabStore.getState().add({ id, url, kind: 'Script', originalHash: null, lite: false, dirty: false, saving: false });
    return id;
  }

  /** What main has once the switch to B went through. */
  function mainSwitchesTo(id: string, session: SessionState, drafts: Record<string, SessionDraft> = {}) {
    api.getWorkspaces.mockResolvedValue({ workspaces, activeId: id });
    api.getSession.mockResolvedValue(session);
    api.getDraft.mockImplementation(async (tabId) => drafts[tabId] ?? null);
  }

  it("writes this workspace's pending edits, closes its tabs keeping their drafts, and reopens the other's", async () => {
    vi.useFakeTimers();
    stopSync = startSessionSync();
    const leaving = openTab();
    model(leaving).type('typed just before switching');
    mainSwitchesTo(
      'wsb00000',
      { url: 'https://other.test/', tabs: [{ id: 'tab-b1', url: 'https://other.test/b.js', kind: 'Script', originalHash: 'hb' }], activeTabId: 'tab-b1' },
      { 'tab-b1': { content: 'b draft', base: 'b base' } },
    );

    await switchWorkspace('wsb00000');

    // Written before the switch, and to the workspace being left.
    expect(api.saveDraft).toHaveBeenCalledWith(leaving, { content: 'typed just before switching', base: 'base();' });
    expect(api.saveSessionTabs).toHaveBeenCalledWith('wsa00000', [expect.objectContaining({ id: leaving })], leaving);
    expect(api.saveDraft.mock.invocationCallOrder[0]).toBeLessThan(api.switchWorkspace.mock.invocationCallOrder[0]!);
    expect(api.switchWorkspace).toHaveBeenCalledWith('wsb00000');
    // Closing the tab kept its draft for when the workspace is switched back to.
    expect(api.deleteDraft).not.toHaveBeenCalled();

    const { tabs, activeId } = useTabStore.getState();
    expect(tabs.map((t) => [t.id, t.dirty])).toEqual([['tab-b1', true]]);
    expect(activeId).toBe('tab-b1');
    expect(model('tab-b1').getValue()).toBe('b draft');
    expect(useWorkspaceStore.getState()).toMatchObject({ activeId: 'wsb00000', switchingTo: null });

    // From now on the tabs are kept for B.
    api.saveSessionTabs.mockClear();
    openTab();
    await vi.advanceTimersByTimeAsync(400);
    expect(api.saveSessionTabs).toHaveBeenLastCalledWith('wsb00000', expect.any(Array), expect.any(String));
  });

  it('reopens the workspace it was leaving when the switch fails', async () => {
    stopSync = startSessionSync();
    const id = openTab();
    model(id).type('kept');
    api.switchWorkspace.mockRejectedValueOnce(new Error('boom'));
    mainSwitchesTo('wsa00000', { url: 'https://site.test/', tabs: [{ id, url: `https://site.test/${id}.js`, kind: 'Script', originalHash: null }], activeTabId: id }, { [id]: { content: 'kept', base: 'base();' } });

    await switchWorkspace('wsb00000');

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Could not switch workspaces', tone: 'danger' }));
    expect(useWorkspaceStore.getState().activeId).toBe('wsa00000');
    expect(useTabStore.getState().tabs.map((t) => t.id)).toEqual([id]);
    expect(model(id).getValue()).toBe('kept');
  });

  it('writes what is typed while the drafts are being written, before the tabs close', async () => {
    stopSync = startSessionSync();
    const id = openTab();
    model(id).type('first');
    // Writing the first draft takes a moment, and typing goes on meanwhile.
    api.saveDraft.mockImplementationOnce(async () => model(id).type('second'));
    mainSwitchesTo('wsb00000', { url: '', tabs: [], activeTabId: null });

    await switchWorkspace('wsb00000');

    expect(api.saveDraft).toHaveBeenCalledTimes(2);
    expect(api.saveDraft).toHaveBeenLastCalledWith(id, { content: 'second' });
    expect(api.saveDraft.mock.invocationCallOrder[1]).toBeLessThan(api.switchWorkspace.mock.invocationCallOrder[0]!);
  });

  it('removes a new workspace again when it was never switched to', async () => {
    api.createWorkspace.mockResolvedValue(workspace('wsc00000', ''));
    api.switchWorkspace.mockRejectedValueOnce(new Error('boom'));
    mainSwitchesTo('wsa00000', { url: '', tabs: [], activeTabId: null });
    expect(await createWorkspace()).toBe(false);
    expect(api.deleteWorkspace).toHaveBeenCalledWith('wsc00000');
  });

  const rule = (id: string): Rule => ({
    id,
    action: 'block',
    match: { type: 'glob', pattern: `https://${id}.test/*`, ignoreQuery: true },
    resourceTypes: [],
    enabled: true,
    createdAt: 0,
    updatedAt: 0,
  });
  const WHATS_NEW = { id: 'page:whats-new', page: 'whats-new', title: "What's New" } as const;

  it("reloads the rules of the workspace switched to, and closes the other's rule pages but not What's New", async () => {
    useRuleStore.getState().setAll([rule('r1')]);
    const tabs = useTabStore.getState();
    tabs.openPage(WHATS_NEW);
    tabs.openPage({ id: 'page:rule:r1', page: 'rule', ruleId: 'r1', title: 'r1' });
    tabs.openPage({ id: 'page:new-rule:x', page: 'new-rule', seed: { action: 'cors', match: rule('r1').match, resourceTypes: [] }, title: 'New' });
    api.listRules.mockResolvedValueOnce([rule('r2')]);
    mainSwitchesTo('wsb00000', { url: '', tabs: [], activeTabId: null });

    await switchWorkspace('wsb00000');

    expect(confirm).not.toHaveBeenCalled();
    expect(Object.keys(useRuleStore.getState().byId)).toEqual(['r2']);
    expect(useTabStore.getState().pages.map((p) => p.id)).toEqual([WHATS_NEW.id]);
    expect(useTabStore.getState().activeId).toBe(WHATS_NEW.id);
  });

  it('asks before losing a rule page’s unapplied edits; cancelling stays in the workspace', async () => {
    useRuleStore.getState().setAll([rule('r1')]);
    const input = { action: 'block' as const, match: rule('r1').match, resourceTypes: [] };
    useTabStore.getState().openPage({ id: 'page:rule:r1', page: 'rule', ruleId: 'r1', title: 'r1' });
    useTabStore.getState().setPageDraft('page:rule:r1', { base: input, value: { ...input, resourceTypes: ['Script'] }, rowKeys: [] });
    confirm.mockResolvedValueOnce(false);
    mainSwitchesTo('wsb00000', { url: '', tabs: [], activeTabId: null });

    await switchWorkspace('wsb00000');

    expect(confirm).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ title: 'Discard your unapplied rule changes?' }));
    expect(api.switchWorkspace).not.toHaveBeenCalled();
    expect(useTabStore.getState().pages.map((p) => p.id)).toEqual(['page:rule:r1']);
    expect(useWorkspaceStore.getState()).toMatchObject({ activeId: 'wsa00000', switchingTo: null });

    // Confirmed, the switch goes on and the page closes.
    await switchWorkspace('wsb00000');
    expect(api.switchWorkspace).toHaveBeenCalledWith('wsb00000');
    expect(useTabStore.getState().pages).toEqual([]);
  });

  it('deleting the workspace in use switches to its neighbour first', async () => {
    mainSwitchesTo('wsb00000', { url: '', tabs: [], activeTabId: null });
    await deleteWorkspace('wsa00000');
    expect(api.switchWorkspace).toHaveBeenCalledWith('wsb00000');
    expect(api.deleteWorkspace).toHaveBeenCalledWith('wsa00000');
    expect(api.switchWorkspace.mock.invocationCallOrder[0]).toBeLessThan(api.deleteWorkspace.mock.invocationCallOrder[0]!);
  });
});
