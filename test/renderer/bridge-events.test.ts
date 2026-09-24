import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppEvent, MenuCommand, OverrideMeta, PageState, ResourceEntry, UpdateState } from '../../src/shared/types';
import { handleAppEvent } from '@/app/model/bridge';
import { APP_EVENT_HANDLERS } from '@/app/model/bridge/appEventHandlers';
import { pageCommands } from '@/app/model/bridge/commands/pageCommands';
import type { MenuCommandHandlers } from '@/app/model/bridge/commands/types';
import type { AppEventHandlers, AppEventOf } from '@/app/model/bridge/types';
import { flushSession } from '@/app/model/session';
import { useTabStore, type TabMeta } from '@/entities/editor-tab';
import { useOverrideStore } from '@/entities/override';
import { usePageStore } from '@/entities/page';
import { useResourceStore } from '@/entities/resource';
import { toggleBaseDiff } from '@/features/compare-changes';
import { formatTab } from '@/features/format-document';
import { saveTab } from '@/features/save-override';
import { checkForUpdatesNow, handleUpdateState, openWhatsNew } from '@/features/update-app';

const api = vi.hoisted(() => ({ reload: vi.fn(async () => {}), sessionFlushed: vi.fn() }));
const toast = vi.hoisted(() => Object.assign(vi.fn(() => 'toast-1'), { dismiss: vi.fn(), update: vi.fn() }));
const editor = vi.hoisted(() => ({ hasFocus: vi.fn(() => false), trigger: vi.fn() }));

vi.mock('@/shared/api', () => ({ api, onAppEvent: () => () => {}, errorMessage: (err: unknown) => String(err) }));
vi.mock('@/shared/ui/toast', () => ({ toast }));
vi.mock('@/shared/ui/dialog', () => ({ confirm: async () => true, isConfirmOpen: () => false }));
vi.mock('@/shared/monaco', () => ({
  monaco: { editor: { createModel: () => ({}) }, Uri: { from: () => ({}) } },
  languageFor: () => 'javascript',
  editorHasFocus: editor.hasFocus,
  dismissEditorWidgets: () => {},
  triggerInActiveEditor: editor.trigger,
}));
vi.mock('@/features/save-override', () => ({ saveTab: vi.fn(async () => {}) }));
vi.mock('@/features/format-document', () => ({ formatTab: vi.fn(async () => {}) }));
vi.mock('@/features/compare-changes', () => ({ toggleBaseDiff: vi.fn() }));
vi.mock('@/features/update-app', () => ({ openWhatsNew: vi.fn(), checkForUpdatesNow: vi.fn(async () => {}), handleUpdateState: vi.fn(), startUpdates: vi.fn(async () => {}) }));
vi.mock('@/app/model/session', () => ({ flushSession: vi.fn(async () => true), restoreSession: async () => {}, startSessionSync: () => () => {} }));

const meta = (id: string): OverrideMeta => ({
  id,
  kind: 'Script',
  sourceUrl: `https://a.com/${id}.js`,
  match: { type: 'exact', pattern: `https://a.com/${id}.js`, ignoreQuery: false },
  enabled: true,
  originalHash: null,
  createdAt: 0,
  updatedAt: 0,
});
const tab = (id: string, overrideId?: string): TabMeta => ({
  id,
  url: `https://a.com/${id}.js`,
  kind: 'Script',
  overrideId,
  originalHash: null,
  lite: false,
  dirty: false,
  saving: false,
});
const res = (url: string): ResourceEntry => ({ url, kind: 'Script', mimeType: 'text/javascript', status: 200 });
const command = (name: MenuCommand) => handleAppEvent({ type: 'command', command: name });

beforeEach(() => {
  vi.clearAllMocks();
  editor.hasFocus.mockReturnValue(false);
  useTabStore.setState({ tabs: [], activeId: null, diff: 'off' });
  useOverrideStore.setState({ byId: {}, hits: {}, upstreamChanged: {} });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('app event bridge', () => {
  it('shows one "override missed" toast per override, whose action reloads the page', async () => {
    handleAppEvent({ type: 'override-missed', overrideId: 'o1', url: 'https://a.com/app.js' });
    handleAppEvent({ type: 'override-missed', overrideId: 'o1', url: 'https://a.com/app.js?v=2' });
    expect(toast).toHaveBeenCalledTimes(2);
    const calls = toast.mock.calls as unknown as Array<[{ id: string; title: string; action: { onClick(): void } }]>;
    // Same id: the second replaces the first instead of stacking.
    expect(calls.map(([t]) => t.id)).toEqual(['missed:o1', 'missed:o1']);
    expect(calls[0]![0].title).toContain('app.js');
    calls[0]![0].action.onClick();
    await vi.waitFor(() => expect(api.reload).toHaveBeenCalledTimes(1));
  });

  it('says once per override that its live file changed', () => {
    handleAppEvent({ type: 'upstream-changed', overrideId: 'o1', url: 'https://a.com/app.js' });
    handleAppEvent({ type: 'upstream-changed', overrideId: 'o1', url: 'https://a.com/app.js' });
    handleAppEvent({ type: 'upstream-changed', overrideId: 'o2', url: 'https://a.com/other.js' });
    expect(toast).toHaveBeenCalledTimes(2);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining('app.js'), tone: 'warning' }));
    expect(useOverrideStore.getState().upstreamChanged).toEqual({ o1: true, o2: true });
  });

  it('shows errors from the main process', () => {
    handleAppEvent({ type: 'error', message: 'CDP detached' });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'CDP detached', tone: 'danger' }));
  });

  it('counts the hits of served overrides', () => {
    handleAppEvent({ type: 'override-served', overrideId: 'o1', url: 'https://a.com/app.js' });
    handleAppEvent({ type: 'override-served', overrideId: 'o1', url: 'https://a.com/app.js' });
    expect(useOverrideStore.getState().hits).toEqual({ o1: 2 });
  });

  it('mirrors the page state', () => {
    const state: PageState = { url: 'https://a.com/', title: 'A', loading: true, canGoBack: false, canGoForward: false };
    handleAppEvent({ type: 'page-state', state });
    expect(usePageStore.getState().page).toEqual(state);
  });

  it('takes the new override list, and unlinks the tabs of deleted overrides', () => {
    useOverrideStore.getState().setAll([meta('o1'), meta('o2')]);
    useTabStore.setState({ tabs: [tab('t1', 'o1'), tab('t2', 'o2'), tab('t3')] });
    handleAppEvent({ type: 'overrides-changed', overrides: [meta('o2')] });
    expect(Object.keys(useOverrideStore.getState().byId)).toEqual(['o2']);
    expect(useTabStore.getState().tabs.map((t) => t.overrideId)).toEqual([undefined, 'o2', undefined]);
  });

  it.each([
    ['all drafts were written', async () => true, true],
    ['a draft could not be written', async () => false, false],
    ['flushing threw', async () => Promise.reject(new Error('disk full')), false],
  ])('answers flush-session when %s', async (_, flush, ok) => {
    vi.mocked(flushSession).mockImplementationOnce(flush);
    handleAppEvent({ type: 'flush-session' });
    await vi.waitFor(() => expect(api.sessionFlushed).toHaveBeenCalledWith(ok));
  });

  it('drops the resource changes queued before a top-level navigation', () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const apply = vi.spyOn(useResourceStore.getState(), 'apply');
    handleAppEvent({ type: 'resource', resource: res('https://old.test/a.js') });
    handleAppEvent({ type: 'navigated', url: 'https://site.test/' });
    handleAppEvent({ type: 'resource', resource: res('https://site.test/b.js') });
    frames[0]!(0);
    expect(apply).toHaveBeenCalledExactlyOnceWith([{ type: 'reset' }, { type: 'add', entry: res('https://site.test/b.js') }]);
    apply.mockRestore();
  });

  it('hands update states to the update feature', () => {
    const state: UpdateState = { status: 'idle' };
    handleAppEvent({ type: 'update', state });
    expect(handleUpdateState).toHaveBeenCalledExactlyOnceWith(state);
  });

  it('ignores an event type it does not know (main and renderer out of step)', () => {
    expect(() => handleAppEvent({ type: 'zoom-changed' } as unknown as AppEvent)).not.toThrow();
    expect(toast).not.toHaveBeenCalled();
  });
});

describe('menu commands', () => {
  const execCommand = vi.fn();
  const page = { focusAddressBar: vi.fn(), togglePalette: vi.fn(), toggleSidebar: vi.fn() };

  beforeEach(() => {
    vi.stubGlobal('document', { execCommand });
  });
  afterEach(() => {
    pageCommands.current = null;
  });

  it('saves and formats the active tab: no tab id is passed', () => {
    command('save');
    command('format');
    expect(saveTab).toHaveBeenCalledExactlyOnceWith();
    expect(formatTab).toHaveBeenCalledExactlyOnceWith();
  });

  it('toggles the base diff', () => {
    command('toggle-diff');
    expect(toggleBaseDiff).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['focus-url', 'focusAddressBar'],
    ['toggle-palette', 'togglePalette'],
    ['toggle-sidebar', 'toggleSidebar'],
  ] as const)('asks the shown page to run %s (%s)', (name, method) => {
    pageCommands.current = page;
    command(name);
    for (const [key, fn] of Object.entries(page)) expect(fn).toHaveBeenCalledTimes(key === method ? 1 : 0);
  });

  it('opens What\'s New and checks for updates', () => {
    command('whats-new');
    command('check-updates');
    expect(openWhatsNew).toHaveBeenCalledExactlyOnceWith();
    expect(checkForUpdatesNow).toHaveBeenCalledExactlyOnceWith();
  });

  it('does nothing for page commands before the bridge has them', () => {
    expect(() => command('focus-url')).not.toThrow();
  });

  // The ids Monaco registers its handlers under, and document.execCommand's names.
  const EDIT_TARGETS = [
    ['undo', 'undo', 'undo'],
    ['redo', 'redo', 'redo'],
    ['select-all', 'editor.action.selectAll', 'selectAll'],
  ] as const;

  it.each(EDIT_TARGETS)('sends %s to Monaco as "%s" when the editor has focus', (name, handlerId) => {
    editor.hasFocus.mockReturnValue(true);
    command(name);
    expect(editor.trigger).toHaveBeenCalledExactlyOnceWith(handlerId);
    expect(execCommand).not.toHaveBeenCalled();
  });

  it.each(EDIT_TARGETS)('sends %s to the focused native field otherwise', (name, _, execName) => {
    command(name);
    expect(execCommand).toHaveBeenCalledExactlyOnceWith(execName);
    expect(editor.trigger).not.toHaveBeenCalled();
  });

  it('ignores a command it does not know', () => {
    expect(() => command('find' as MenuCommand)).not.toThrow();
    expect(execCommand).not.toHaveBeenCalled();
  });
});

describe('handler tables', () => {
  it('need a handler for every event type and menu command, each taking only its own', () => {
    // @ts-expect-error: a table missing event types does not typecheck.
    const events: AppEventHandlers = { navigated: () => {} };
    // @ts-expect-error: nor one missing menu commands.
    const commands: MenuCommandHandlers = { save: () => {} };
    // @ts-expect-error: a handler does not accept another type's event.
    const wrong: (event: AppEventOf<'error'>) => void = APP_EVENT_HANDLERS.navigated;
    expect([events, commands, wrong]).toHaveLength(3);
  });
});
