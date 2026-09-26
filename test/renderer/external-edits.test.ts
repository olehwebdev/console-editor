/**
 * Override files changed in another editor: the open tab takes the new text as saved, or keeps its
 * unsaved edits and says so; the page reloads as a save does.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type OverrideMeta } from '../../src/shared/types';
import { handleAppEvent } from '@/app/model/bridge';
import { createTabModel, getTabModel, newTabId, useTabStore } from '@/entities/editor-tab';
import { useOverrideStore } from '@/entities/override';
import { useSettingsStore } from '@/entities/settings';
import { openInEditor, takeFileVersion } from '@/features/override/external-editor';
import { saveTab } from '@/features/save-override';

/** Just enough of a Monaco text model: text, an alternative version id, change listeners. */
const { FakeModel } = vi.hoisted(() => {
  class FakeModel {
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
    dispose() {}
  }
  return { FakeModel };
});

const api = vi.hoisted(() => ({
  getOverride: vi.fn(),
  updateOverride: vi.fn(),
  openOverrideInEditor: vi.fn(async () => {}),
  showOverrideFile: vi.fn(async () => {}),
  reload: vi.fn(async () => {}),
}));
const toast = vi.hoisted(() => Object.assign(vi.fn(() => 'toast-1'), { dismiss: vi.fn(), update: vi.fn() }));

vi.mock('@/shared/api', () => ({ api, onAppEvent: () => () => {}, errorMessage: (err: unknown) => String(err) }));
vi.mock('@/shared/ui/toast', () => ({ toast }));
vi.mock('@/shared/monaco', () => ({
  monaco: { editor: { createModel: (text: string) => new FakeModel(text) }, Uri: { from: () => ({}) } },
  languageFor: () => 'javascript',
  setModelSchema: () => {},
  editorHasFocus: () => false,
  dismissEditorWidgets: () => {},
  triggerInActiveEditor: () => {},
}));

type Model = InstanceType<typeof FakeModel>;

const meta = (id: string, patch: Partial<OverrideMeta> = {}): OverrideMeta => ({
  id,
  kind: 'Script',
  sourceUrl: `https://site.test/${id}.js`,
  match: { type: 'exact', pattern: `https://site.test/${id}.js`, ignoreQuery: false },
  enabled: true,
  originalHash: null,
  createdAt: 0,
  updatedAt: 0,
  ...patch,
});

function openTab(overrideId: string, text = 'mine();'): { id: string; model: Model } {
  const id = newTabId();
  createTabModel(id, `https://site.test/${overrideId}.js`, 'Script', text);
  useTabStore.getState().add({ id, url: `https://site.test/${overrideId}.js`, kind: 'Script', overrideId, originalHash: null, lite: false, dirty: false, saving: false });
  return { id, model: getTabModel(id) as unknown as Model };
}

const tab = (id: string) => useTabStore.getState().tabs.find((t) => t.id === id)!;

/** What main sends once another editor's save is served. */
async function editedElsewhere(ids: string[], content = 'theirs();'): Promise<void> {
  api.getOverride.mockImplementation(async (id: string) => ({ ...meta(id), content }));
  handleAppEvent({ type: 'overrides-edited', overrideIds: ids });
  await vi.waitFor(() => expect(toast).toHaveBeenCalled());
}

beforeEach(() => {
  vi.clearAllMocks();
  useTabStore.setState({ tabs: [], activeId: null, diff: 'off' });
  useOverrideStore.setState({ byId: {}, hits: {}, upstreamChanged: {} });
  useSettingsStore.getState().setSettings(DEFAULT_SETTINGS);
});

describe('edits made in another editor', () => {
  it('shows the new text as saved in a tab without edits, and reloads the page', async () => {
    useOverrideStore.getState().setAll([meta('o1')]);
    const { id, model } = openTab('o1');
    await editedElsewhere(['o1']);
    expect(model.getValue()).toBe('theirs();');
    expect(tab(id)).toMatchObject({ dirty: false });
    expect(tab(id).editedOutside).toBeUndefined();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'o1.js changed in another editor', description: 'Reloading the page with the new version.' }));
    await vi.waitFor(() => expect(api.reload).toHaveBeenCalledTimes(1));
  });

  it('keeps unsaved edits, and the tab stays unsaved whatever is undone, until it takes the file', async () => {
    useOverrideStore.getState().setAll([meta('o1')]);
    const { id, model } = openTab('o1');
    model.type('my edit();');
    await editedElsewhere(['o1']);
    expect(model.getValue()).toBe('my edit();');
    expect(tab(id)).toMatchObject({ dirty: true, editedOutside: true });
    // Back to the text it had: the file no longer holds it.
    model.type('mine();');
    expect(tab(id).dirty).toBe(true);

    await takeFileVersion(id);
    expect(model.getValue()).toBe('theirs();');
    expect(tab(id)).toMatchObject({ dirty: false, editedOutside: undefined });
  });

  it('is saved over by the next save, which clears the notice', async () => {
    useOverrideStore.getState().setAll([meta('o1')]);
    const { id, model } = openTab('o1');
    model.type('my edit();');
    await editedElsewhere(['o1']);
    api.updateOverride.mockResolvedValue(meta('o1'));
    await saveTab(id);
    expect(api.updateOverride).toHaveBeenCalledWith('o1', { content: 'my edit();' });
    expect(tab(id)).toMatchObject({ dirty: false, editedOutside: undefined });
  });

  it('takes the file as saved when the edits already match it', async () => {
    useOverrideStore.getState().setAll([meta('o1')]);
    const { id, model } = openTab('o1');
    model.type('theirs();');
    await editedElsewhere(['o1']);
    expect(tab(id)).toMatchObject({ dirty: false });
    expect(tab(id).editedOutside).toBeUndefined();
  });

  it('counts several files in one notice and reloads once', async () => {
    useOverrideStore.getState().setAll([meta('o1'), meta('o2')]);
    await editedElsewhere(['o1', 'o2']);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: '2 overrides changed in another editor' }));
    await vi.waitFor(() => expect(api.reload).toHaveBeenCalledTimes(1));
    // No tab shows them: nothing to read.
    expect(api.getOverride).not.toHaveBeenCalled();
  });

  it("doesn't reload for a turned-off override, nor with reloading off", async () => {
    useOverrideStore.getState().setAll([meta('o1', { enabled: false })]);
    await editedElsewhere(['o1']);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: undefined }));

    vi.clearAllMocks();
    useOverrideStore.getState().setAll([meta('o2')]);
    useSettingsStore.getState().setSettings({ ...DEFAULT_SETTINGS, autoReloadOnSave: false });
    await editedElsewhere(['o2']);
    await new Promise((r) => setTimeout(r, 0));
    expect(api.reload).not.toHaveBeenCalled();
  });
});

describe('open in VS Code', () => {
  it('offers to show the file in its folder when VS Code does not open', async () => {
    api.openOverrideInEditor.mockRejectedValueOnce(new Error('No application knows how to open the URL'));
    await openInEditor('o1');
    const [[options]] = toast.mock.calls as unknown as [[{ title: string; action: { label: string; onClick(): void } }]];
    expect(options).toMatchObject({ title: 'Could not open VS Code', action: { label: 'Show in folder' } });
    options.action.onClick();
    expect(api.showOverrideFile).toHaveBeenCalledWith('o1');
  });
});
