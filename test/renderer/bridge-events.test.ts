import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppEvent, CreateRuleInput, MenuCommand, OverrideMeta, PageState, ResourceEntry, Rule, UpdateState } from '../../src/shared/types';
import { handleAppEvent } from '@/app/model/bridge';
import { HIDDEN_FLUSH_MS } from '@/app/model/bridge/resources/constants';
import { APP_EVENT_HANDLERS } from '@/app/model/bridge/appEventHandlers';
import { pageCommands } from '@/app/model/bridge/commands/pageCommands';
import { pageSession } from '@/app/model/bridge/pageSession';
import type { MenuCommandHandlers } from '@/app/model/bridge/commands/types';
import type { AppEventHandlers, AppEventOf } from '@/app/model/bridge/types';
import { useTabStore, type TabMeta } from '@/entities/editor-tab';
import { useOverrideStore } from '@/entities/override';
import { usePageStore } from '@/entities/page';
import { useResourceStore } from '@/entities/resource';
import { toRuleInput, useRuleStore } from '@/entities/rule';
import { useWorkspaceStore } from '@/entities/workspace';
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
const rule = (id: string, pattern = `https://a.com/${id}/*`): Rule => ({
  id,
  action: 'block',
  match: { type: 'glob', pattern, ignoreQuery: true },
  resourceTypes: [],
  enabled: true,
  createdAt: 0,
  updatedAt: 0,
});
const command = (name: MenuCommand) => handleAppEvent({ type: 'command', command: name });

beforeEach(() => {
  vi.clearAllMocks();
  editor.hasFocus.mockReturnValue(false);
  useTabStore.setState({ tabs: [], pages: [], activeId: null, diff: 'off' });
  useOverrideStore.setState({ byId: {}, hits: {}, upstreamChanged: {} });
  useRuleStore.setState({ byId: {}, hits: {}, recent: {} });
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
    const workspace = { id: 'w1', name: 'Shop', host: 'a.com', title: 'A', icon: 'favicon' as const, color: 'teal' as const };
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

  it("takes the new rule list: a deleted rule's page closes, and edits made to an older version are dropped", () => {
    const [r1, r2, r3] = [rule('r1'), rule('r2'), rule('r3')];
    useRuleStore.getState().setAll([r1, r2, r3]);
    const tabs = useTabStore.getState();
    const draftOf = (base: CreateRuleInput) => ({ base, value: { ...base, resourceTypes: ['Script' as const] }, rowKeys: [] });
    tabs.openPage({ id: 'page:rule:r1', page: 'rule', ruleId: 'r1', title: 'r1', draft: draftOf(toRuleInput(r1)) });
    tabs.openPage({ id: 'page:rule:r2', page: 'rule', ruleId: 'r2', title: 'r2', draft: draftOf(toRuleInput(r2)) });
    tabs.openPage({ id: 'page:rule:r3', page: 'rule', ruleId: 'r3', title: 'r3' });

    // r1 changed elsewhere, r2 was only turned off (not part of the input), r3 deleted.
    const changed = rule('r1', 'https://b.com/*');
    handleAppEvent({ type: 'rules-changed', rules: [changed, { ...r2, enabled: false }] });

    expect(useRuleStore.getState().byId).toEqual({ r1: changed, r2: { ...r2, enabled: false } });
    const pages = useTabStore.getState().pages;
    expect(pages.map((p) => p.id)).toEqual(['page:rule:r1', 'page:rule:r2']);
    expect(pages.map((p) => ('draft' in p ? !!p.draft : null))).toEqual([false, true]);
    expect(useTabStore.getState().activeId).toBe('page:rule:r2');
  });

  it('counts rule hits once per frame: three in one frame are one store update', () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const recordHits = vi.spyOn(useRuleStore.getState(), 'recordHits');
    handleAppEvent({ type: 'rule-applied', ruleId: 'r1', url: 'https://a.com/beacon' });
    handleAppEvent({ type: 'rule-applied', ruleId: 'r1', url: 'https://a.com/beacon' });
    handleAppEvent({ type: 'rule-applied', ruleId: 'r2', url: 'https://a.com/app.js' });
    expect(frames).toHaveLength(1);
    expect(recordHits).not.toHaveBeenCalled();
    frames[0]!(0);
    expect(recordHits).toHaveBeenCalledExactlyOnceWith([
      { ruleId: 'r1', url: 'https://a.com/beacon' },
      { ruleId: 'r1', url: 'https://a.com/beacon' },
      { ruleId: 'r2', url: 'https://a.com/app.js' },
    ]);
    recordHits.mockRestore();
    expect(useRuleStore.getState().hits).toEqual({ r1: 2, r2: 1 });
    expect(useRuleStore.getState().recent.r1).toEqual([{ url: 'https://a.com/beacon', count: 2, lastAt: expect.any(Number) }]);
  });

  it('counts rule hits while the window is hidden too (no frames), after HIDDEN_FLUSH_MS', () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => {});
    handleAppEvent({ type: 'rule-applied', ruleId: 'r1', url: 'https://a.com/beacon' });
    expect(useRuleStore.getState().hits).toEqual({});
    vi.advanceTimersByTime(HIDDEN_FLUSH_MS);
    expect(useRuleStore.getState().hits).toEqual({ r1: 1 });
    vi.useRealTimers();
  });

  it('shows one "rule missed" toast per rule and URL, whose action reloads the page', async () => {
    handleAppEvent({ type: 'rule-missed', ruleId: 'r1', url: 'https://a.com/analytics.js' });
    handleAppEvent({ type: 'rule-missed', ruleId: 'r1', url: 'https://a.com/analytics.js' });
    const calls = toast.mock.calls as unknown as Array<[{ id: string; title: string; tone: string; action: { label: string; onClick(): void } }]>;
    expect(calls).toHaveLength(2);
    expect(calls[0]![0].id).toBe(calls[1]![0].id);
    expect(calls[0]![0]).toMatchObject({ title: expect.stringContaining('analytics.js'), tone: 'warning', action: { label: 'Reload page' } });
    calls[0]![0].action.onClick();
    await vi.waitFor(() => expect(api.reload).toHaveBeenCalledTimes(1));
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
