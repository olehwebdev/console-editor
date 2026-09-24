import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OverrideMeta, SessionDraft, SessionState } from '../../src/shared/types';
import { flushSession, restoreSession, startSessionSync } from '@/app/model/session';
import { createTabModel, disposeTabModel, getTabModel, markTabSaved, newTabId, useTabStore } from '@/entities/editor-tab';
import { useOverrideStore } from '@/entities/override';

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
}));
const toast = vi.hoisted(() => Object.assign(vi.fn(() => 'toast-1'), { dismiss: vi.fn(), update: vi.fn() }));

vi.mock('@/shared/api', () => ({ api, onAppEvent: () => () => {}, errorMessage: (err: unknown) => String(err) }));
vi.mock('@/shared/ui/toast', () => ({ toast }));
vi.mock('@/shared/ui/dialog', () => ({ confirm: async () => true, isConfirmOpen: () => false }));
vi.mock('@/shared/monaco', () => ({
  monaco: { editor: { createModel: (text: string) => new FakeModel(text) }, Uri: { from: () => ({}) } },
  languageFor: () => 'javascript',
  editorHasFocus: () => false,
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

let stopSync: (() => void) | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  for (const t of useTabStore.getState().tabs) disposeTabModel(t.id);
  useTabStore.setState({ tabs: [], activeId: null, diff: 'off' });
  useOverrideStore.getState().setAll([override]);
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
    expect(api.saveSessionTabs).toHaveBeenLastCalledWith([expect.objectContaining({ id, url: `https://site.test/${id}.js` })], id);

    model(id).type('edit 1');
    model(id).type('edit 2');
    await vi.advanceTimersByTimeAsync(900);
    expect(api.saveDraft).toHaveBeenCalledTimes(1);
    expect(api.saveDraft).toHaveBeenLastCalledWith(id, { content: 'edit 2', base: 'base();' });
    model(id).type('edit 3');
    await vi.advanceTimersByTimeAsync(900);
    expect(api.saveDraft).toHaveBeenLastCalledWith(id, { content: 'edit 3' });
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
});
