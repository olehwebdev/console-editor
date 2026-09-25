import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppEvent, MenuCommand, OverrideMeta, PageState, ResourceEntry, UpdateState } from '../../src/shared/types';
import { handleAppEvent } from '@/app/model/bridge';
import { APP_EVENT_HANDLERS } from '@/app/model/bridge/appEventHandlers';
import { pageCommands } from '@/app/model/bridge/commands/pageCommands';
import { pageSession } from '@/app/model/bridge/pageSession';
import type { MenuCommandHandlers } from '@/app/model/bridge/commands/types';
import type { AppEventHandlers, AppEventOf } from '@/app/model/bridge/types';
import { useTabStore, type TabMeta } from '@/entities/editor-tab';
import { useOverrideStore } from '@/entities/override';
import { usePageStore } from '@/entities/page';
import { useResourceStore } from '@/entities/resource';
import { useSourceMapStore } from '@/entities/source-map';
import { useWorkspaceStore } from '@/entities/workspace';
import { toggleBaseDiff } from '@/features/compare-changes';
import { jumpToMappedCode } from '@/features/open-resource';
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
vi.mock('@/features/open-resource', async (importOriginal) => ({ ...(await importOriginal<object>()), jumpToMappedCode: vi.fn(async () => {}) }));
vi.mock('@/features/update-app', () => ({ openWhatsNew: vi.fn(), checkForUpdatesNow: vi.fn(async () => {}), handleUpdateState: vi.fn(), startUpdates: vi.fn(async () => {}) }));

const meta = (id: string, updatedAt = 0): OverrideMeta => ({
  id,
  kind: 'Script',
  sourceUrl: `https://a.com/${id}.js`,
  match: { type: 'exact', pattern: `https://a.com/${id}.js`, ignoreQuery: false },
  enabled: true,
  originalHash: null,
  createdAt: 0,
  updatedAt,
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

interface ShownToast {
  id: string;
  title: string;
  description: string;
  tone: string;
  action?: { label: string; onClick(): void };
}
const shown = () => (toast.mock.calls as unknown as Array<[ShownToast]>).map(([t]) => t);

beforeEach(() => {
  vi.clearAllMocks();
  editor.hasFocus.mockReturnValue(false);
  useTabStore.setState({ tabs: [], activeId: null, diff: 'off' });
  useOverrideStore.setState({ byId: {}, hits: {}, upstreamChanged: {} });
});
afterEach(() => {
  vi.unstubAllGlobals();
  pageSession.current = null;
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

  it("says a nested worker's first script can't be changed, with no reload to offer", () => {
    handleAppEvent({ type: 'override-missed', overrideId: 'o2', url: 'https://a.com/workers/nested.js', reason: 'nested-worker' });
    const [shownToast] = shown();
    expect(shownToast).toMatchObject({ id: 'missed:o2', title: "Your override can't apply to nested.js", tone: 'warning' });
    expect(shownToast.description).toMatch(/first script of a worker started by another worker/);
    // Reloading can't help.
    expect(shownToast.action).toBeUndefined();
  });

  it("tells of a nested worker's first script once per version of the override (every page load reports it), other misses every time", () => {
    useOverrideStore.getState().setAll([meta('n1', 1)]);
    const nested = { type: 'override-missed', overrideId: 'n1', url: 'https://a.com/workers/nested.js', reason: 'nested-worker' } as const;
    handleAppEvent(nested);
    handleAppEvent(nested);
    expect(shown().map((t) => t.id)).toEqual(['missed:n1']);
    handleAppEvent({ type: 'override-missed', overrideId: 'n1', url: 'https://a.com/workers/nested.js' });
    handleAppEvent({ type: 'override-missed', overrideId: 'n1', url: 'https://a.com/workers/nested.js' });
    handleAppEvent({ type: 'override-missed', overrideId: 'sw', url: 'https://a.com/sw.js', reason: 'service-worker-update' });
    handleAppEvent({ type: 'override-missed', overrideId: 'sw', url: 'https://a.com/sw.js', reason: 'service-worker-update' });
    expect(toast).toHaveBeenCalledTimes(5);
    // Saved again: said again, once.
    useOverrideStore.getState().setAll([meta('n1', 2)]);
    handleAppEvent(nested);
    handleAppEvent(nested);
    expect(toast).toHaveBeenCalledTimes(6);
    expect(shown().at(-1)?.title).toBe("Your override can't apply to nested.js");
  });

  it("says Chromium's update check reinstalled a service worker, and offers the reload that reinstalls yours", async () => {
    handleAppEvent({ type: 'override-missed', overrideId: 'o3', url: 'https://a.com/sw.js', reason: 'service-worker-update' });
    const [shownToast] = shown();
    expect(shownToast).toMatchObject({ id: 'missed:o3', title: 'The service worker reinstalled the live sw.js', tone: 'warning' });
    expect(shownToast.description).toMatch(/update check/);
    expect(shownToast.description).toMatch(/Settings › Bypass service workers/);
    expect(shownToast.action?.label).toBe('Reload page');
    shownToast.action!.onClick();
    await vi.waitFor(() => expect(api.reload).toHaveBeenCalledTimes(1));
  });

  it('keeps the usual "reload usually fixes it" toast when no reason is given', () => {
    handleAppEvent({ type: 'override-missed', overrideId: 'o1', url: 'https://a.com/app.js' });
    const [shownToast] = shown();
    expect(shownToast.title).toBe("Your override didn't apply to app.js");
    expect(shownToast.description).toMatch(/Reloading usually fixes it/);
    expect(shownToast.action?.label).toBe('Reload page');
  });

  it('tells a miss for a reason it does not know (main and renderer out of step) as one without a reason', () => {
    handleAppEvent({ type: 'override-missed', overrideId: 'o4', url: 'https://a.com/app.js', reason: 'renamed-reason' } as unknown as AppEvent);
    expect(shown()).toEqual([expect.objectContaining({ title: "Your override didn't apply to app.js", action: expect.objectContaining({ label: 'Reload page' }) })]);
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
    pageSession.current = { restore: async () => {}, startSync: () => () => {}, flush };
    handleAppEvent({ type: 'flush-session' });
    await vi.waitFor(() => expect(api.sessionFlushed).toHaveBeenCalledWith(ok));
  });

  it('answers flush-session before the bridge has a session: there is nothing to write', async () => {
    handleAppEvent({ type: 'flush-session' });
    await vi.waitFor(() => expect(api.sessionFlushed).toHaveBeenCalledWith(true));
  });

  it('mirrors the workspaces and their site icons', () => {
    const workspace = { id: 'w1', name: 'Shop', host: 'a.com', title: 'A', icon: 'favicon' as const, color: 'teal' as const, frameNames: {} };
    handleAppEvent({ type: 'workspaces-changed', state: { activeId: 'w1', workspaces: [workspace] } });
    handleAppEvent({ type: 'workspace-favicon', id: 'w1', favicon: 'data:image/png;base64,AA==' });
    expect(useWorkspaceStore.getState()).toMatchObject({ activeId: 'w1', workspaces: [workspace], favicons: { w1: 'data:image/png;base64,AA==' } });
    handleAppEvent({ type: 'workspace-favicon', id: 'w1', favicon: null });
    expect(useWorkspaceStore.getState().favicons).toEqual({});
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

  it("has loaded source maps checked again after a top-level navigation, not an iframe's", () => {
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const { generation } = useSourceMapStore.getState();
    handleAppEvent({ type: 'navigated', url: 'https://site.test/frame', iframeId: 'f1' });
    expect(useSourceMapStore.getState().generation).toBe(generation);
    handleAppEvent({ type: 'navigated', url: 'https://site.test/' });
    expect(useSourceMapStore.getState().generation).toBe(generation + 1);
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
  const page = { focusAddressBar: vi.fn(), togglePalette: vi.fn(), toggleSidebar: vi.fn(), toggleConsole: vi.fn() };

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

  it('jumps between a bundle and its original code', () => {
    command('jump-to-mapped');
    expect(jumpToMappedCode).toHaveBeenCalledExactlyOnceWith();
  });

  it.each([
    ['focus-url', 'focusAddressBar'],
    ['toggle-palette', 'togglePalette'],
    ['toggle-sidebar', 'toggleSidebar'],
    ['toggle-console', 'toggleConsole'],
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
