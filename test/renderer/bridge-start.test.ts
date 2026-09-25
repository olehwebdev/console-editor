import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type AppEvent, type OverrideMeta, type PageState, type ResourceEntry, type Rule, type Settings } from '../../src/shared/types';
import { handleAppEvent, startBridge } from '@/app/model/bridge';
import { useOverrideStore } from '@/entities/override';
import { usePageStore } from '@/entities/page';
import { useResourceStore } from '@/entities/resource';
import { useRuleStore } from '@/entities/rule';
import { startUpdates } from '@/features/update-app';

const api = vi.hoisted(() => ({
  getSettings: vi.fn(),
  getWorkspaces: vi.fn(),
  getWorkspaceFavicons: vi.fn(),
  listFrames: vi.fn(),
  getConsoleEntries: vi.fn(),
  listOverrides: vi.fn(),
  listRules: vi.fn(),
  listResources: vi.fn(),
  getPageState: vi.fn(),
  sessionFlushed: vi.fn(),
}));
const events = vi.hoisted(() => ({ listener: undefined as ((event: AppEvent) => void) | undefined, off: vi.fn() }));

vi.mock('@/shared/api', () => ({
  api,
  onAppEvent: (listener: (event: AppEvent) => void) => {
    events.listener = listener;
    return events.off;
  },
  errorMessage: (err: unknown) => String(err),
}));
vi.mock('@/shared/ui/toast', () => ({ toast: Object.assign(vi.fn(), { dismiss: vi.fn(), update: vi.fn() }) }));
vi.mock('@/shared/ui/dialog', () => ({ confirm: async () => true, isConfirmOpen: () => false }));
vi.mock('@/shared/monaco', () => ({
  monaco: { editor: { createModel: () => ({}) }, Uri: { from: () => ({}) } },
  languageFor: () => 'javascript',
  editorHasFocus: () => false,
  dismissEditorWidgets: () => {},
  triggerInActiveEditor: () => {},
}));
vi.mock('@/features/update-app', () => ({ openWhatsNew: vi.fn(), checkForUpdatesNow: vi.fn(), handleUpdateState: vi.fn(), startUpdates: vi.fn(async () => {}) }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}

/** Lets pending promise callbacks run. */
const tick = () => new Promise((r) => setTimeout(r, 0));

const meta = (id: string): OverrideMeta => ({
  id,
  kind: 'Script',
  sourceUrl: `https://site.test/${id}.js`,
  match: { type: 'exact', pattern: `https://site.test/${id}.js`, ignoreQuery: false },
  enabled: true,
  originalHash: null,
  createdAt: 0,
  updatedAt: 0,
});
const res = (url: string): ResourceEntry => ({ url, kind: 'Script', mimeType: 'text/javascript', status: 200 });
const rule = (id: string): Rule => ({
  id,
  action: 'block',
  match: { type: 'exact', pattern: `https://site.test/${id}.js`, ignoreQuery: true },
  resourceTypes: [],
  enabled: true,
  createdAt: 0,
  updatedAt: 0,
});
const PAGE: PageState = { url: 'https://site.test/', title: 'Site', loading: false, canGoBack: false, canGoForward: false, detached: false };
const urls = () => Object.values(useResourceStore.getState().byKey).map((e) => e.url);
const emit = (event: AppEvent) => events.listener!(event);
const COMMANDS = { focusAddressBar: vi.fn(), togglePalette: vi.fn(), toggleSidebar: vi.fn(), toggleConsole: vi.fn(), showPreview: vi.fn() };
const SESSION = { restore: vi.fn(async () => {}), startSync: vi.fn(), flush: vi.fn() };
const WORKSPACES = { activeId: 'w1', workspaces: [{ id: 'w1', name: '', host: 'site.test', title: 'Site', icon: 'favicon' as const, color: 'ember' as const }] };

describe('start bridge', () => {
  const frames: FrameRequestCallback[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    frames.length = 0;
    events.listener = undefined;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => {});
    useResourceStore.getState().reset();
    useOverrideStore.setState({ byId: {}, hits: {}, upstreamChanged: {} });
    useRuleStore.setState({ byId: {}, hits: {}, recent: {} });
    api.getSettings.mockResolvedValue(DEFAULT_SETTINGS);
    api.getWorkspaces.mockResolvedValue(WORKSPACES);
    api.getWorkspaceFavicons.mockResolvedValue({});
    api.listFrames.mockResolvedValue([]);
    api.getConsoleEntries.mockResolvedValue([]);
    api.listOverrides.mockResolvedValue([]);
    api.listRules.mockResolvedValue([]);
    api.listResources.mockResolvedValue([]);
    api.getPageState.mockResolvedValue(PAGE);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('applies each snapshot as its reply arrives, so events that come after it win', async () => {
    const settings = deferred<Settings>();
    const overrides = deferred<OverrideMeta[]>();
    const resources = deferred<ResourceEntry[]>();
    const page = deferred<PageState>();
    api.getSettings.mockReturnValue(settings.promise);
    api.listOverrides.mockReturnValue(overrides.promise);
    api.listResources.mockReturnValue(resources.promise);
    api.getPageState.mockReturnValue(page.promise);

    const started = startBridge(COMMANDS, SESSION);
    overrides.resolve([meta('o1')]);
    resources.resolve([res('https://old.test/a.js')]);
    await tick();
    // Main answered those two, then the page navigated and the override was deleted, then it answered the rest.
    emit({ type: 'navigated', url: 'https://site.test/' });
    emit({ type: 'resource', resource: res('https://site.test/b.js') });
    emit({ type: 'overrides-changed', overrides: [] });
    settings.resolve(DEFAULT_SETTINGS);
    page.resolve(PAGE);
    const stop = await started;
    frames.forEach((frame) => frame(0));

    expect(urls()).toEqual(['https://site.test/b.js']);
    expect(useOverrideStore.getState().byId).toEqual({});
    expect(usePageStore.getState().page).toEqual(PAGE);
    stop();
  });

  it("loads the workspace's rules, and a rules-changed event after the reply wins", async () => {
    const rules = deferred<Rule[]>();
    api.listRules.mockReturnValue(rules.promise);

    const started = startBridge(COMMANDS, SESSION);
    rules.resolve([rule('r1'), rule('r2')]);
    await tick();
    expect(Object.keys(useRuleStore.getState().byId)).toEqual(['r1', 'r2']);
    emit({ type: 'rules-changed', rules: [rule('r2')] });
    const stop = await started;

    expect(Object.keys(useRuleStore.getState().byId)).toEqual(['r2']);
    stop();
  });

  it('applies events that arrived before the resource snapshot first', async () => {
    const resources = deferred<ResourceEntry[]>();
    api.listResources.mockReturnValue(resources.promise);

    const started = startBridge(COMMANDS, SESSION);
    // The reset is older than the list: applied after it, it would wipe the list.
    emit({ type: 'navigated', url: 'https://site.test/' });
    emit({ type: 'resource', resource: res('https://site.test/early.js') });
    resources.resolve([res('https://site.test/a.js')]);
    const stop = await started;
    frames.forEach((frame) => frame(0));

    expect(urls().sort()).toEqual(['https://site.test/a.js', 'https://site.test/early.js']);
    stop();
  });

  it('routes events from the start, restores the session, then keeps it in sync; the cleanup stops both', async () => {
    const stopSync = vi.fn();
    SESSION.startSync.mockReturnValue(stopSync);

    const stop = await startBridge(COMMANDS, SESSION);
    expect(events.listener).toBe(handleAppEvent);
    expect(SESSION.restore).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(SESSION.startSync).toHaveBeenCalledTimes(1));

    stop();
    expect(events.off).toHaveBeenCalledTimes(1);
    expect(stopSync).toHaveBeenCalledTimes(1);
  });

  it('starts updates once the session is back', async () => {
    const restore = deferred<void>();
    SESSION.restore.mockReturnValueOnce(restore.promise);

    const stop = await startBridge(COMMANDS, SESSION);
    await tick();
    expect(startUpdates).not.toHaveBeenCalled();
    restore.resolve();
    await vi.waitFor(() => expect(startUpdates).toHaveBeenCalledTimes(1));
    stop();
  });

  it('keeps answering the main process when the initial state fails to load', async () => {
    api.listOverrides.mockRejectedValueOnce(new Error('main process gone'));
    SESSION.flush.mockResolvedValueOnce(true);
    await expect(startBridge(COMMANDS, SESSION)).rejects.toThrow('main process gone');
    expect(SESSION.restore).not.toHaveBeenCalled();

    // Closing the window waits for this answer; unanswered, it warns about lost edits after a timeout.
    expect(events.off).not.toHaveBeenCalled();
    emit({ type: 'flush-session' });
    await vi.waitFor(() => expect(api.sessionFlushed).toHaveBeenCalledExactlyOnceWith(true));
  });

  it('still keeps the session in sync when restoring it failed', async () => {
    SESSION.restore.mockRejectedValueOnce(new Error('corrupt session'));
    const stop = await startBridge(COMMANDS, SESSION);
    await vi.waitFor(() => expect(SESSION.startSync).toHaveBeenCalledTimes(1));
    stop();
  });

  it('does not start syncing when cleaned up before the restore finishes', async () => {
    const restore = deferred<void>();
    SESSION.restore.mockReturnValueOnce(restore.promise);

    const stop = await startBridge(COMMANDS, SESSION);
    stop();
    restore.resolve();
    await tick();

    expect(SESSION.startSync).not.toHaveBeenCalled();
  });
});
