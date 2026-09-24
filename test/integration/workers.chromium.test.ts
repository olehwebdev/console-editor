/**
 * Worker support against real Chromium. The fixture's /workers/ page starts a
 * dedicated worker (which starts a nested one), a module worker, a shared
 * worker, a service worker and an audio worklet; each reports a value from a
 * script it loaded to `window.workerResults`. /workers-frame/ starts the
 * dedicated one (and so its nested one) inside a cross-site iframe.
 *
 * The page is driven through its own CDP session only: as in the app, the
 * engine must be the only client. (Playwright's connection auto-attaches every
 * worker paused and resumes it at once, which can start a service worker
 * before the engine's session reports what it loads.) Every test gets a
 * browser context of its own: service worker registrations, shared workers and
 * the HTTP cache live per context and would otherwise carry over. The engine's
 * commands go through a wrapper that records them and can hold some back, to
 * make the races they guard against happen.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { CdpTransport } from '../../src/main/engine/cdp';
import { sha256 } from '../../src/main/engine/InterceptionEngine';
import { PageInterception } from '../../src/main/engine/PageInterception';
import { attachToPage } from '../../src/main/engine/websocketTransport';
import { defaultMatcherFor } from '../../src/shared/matcher';
import { DEFAULT_SETTINGS, type EngineEvent, type Override, type ResourceEntry, type Settings } from '../../src/shared/types';
import {
  MODULE_DEP_JS,
  NESTED_LIB_JS,
  NESTED_WORKER_JS,
  SHARED_LIB_JS,
  SW_JS,
  SW_LIB_JS,
  WORKER_LIB_JS,
  WORKLET_JS,
  startFixtureSite,
  type FixtureSite,
} from '../fixtures/site';
import { chromiumAvailable, launchChromium, type ChromiumHarness } from '../helpers/chromium';

let nextId = 1;
function makeOverride(partial: Partial<Override> & Pick<Override, 'kind' | 'sourceUrl' | 'content'>): Override {
  return {
    id: `w${nextId++}`,
    match: defaultMatcherFor(partial.sourceUrl),
    enabled: true,
    originalHash: null,
    createdAt: 0,
    updatedAt: nextId,
    ...partial,
  };
}

async function waitFor<T>(fn: () => T | undefined | Promise<T | undefined>, timeout = 10_000): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Timed out');
    await new Promise((r) => setTimeout(r, 50));
  }
}

/** What each worker reports when the fixture's files are served unchanged. */
const ORIGINAL_RESULTS = {
  worker: 'original-lib',
  nested: 'original-nested:original-nested-lib',
  module: 'original-dep',
  shared: 'original-shared-lib',
  sw: 'original-sw:original-sw-lib',
  worklet: 'original',
};
type ResultKey = keyof typeof ORIGINAL_RESULTS;

describe.skipIf(!chromiumAvailable)('workers in Chromium', () => {
  let site: FixtureSite;
  let chrome: ChromiumHarness;
  /** Major version of the browser under test. */
  let chromeVersion: number;
  let browserContextId: string;
  let transport: Awaited<ReturnType<typeof attachToPage>>;
  let interception: PageInterception;
  let overrides: Override[];
  let settings: Settings;
  let events: EngineEvent[];
  /** URLs read through the out-of-page fallback instead of a CDP session. */
  let fallbackFetches: string[];
  /** Requests the fixture site received in this test, by path. */
  let hits: Map<string, number>;
  /** Commands the engine sent, and to which session (undefined: the page's). */
  let sent: Array<{ method: string; sessionId?: string }>;
  /** How long to hold back the engine's commands to shared worker sessions, in ms by method. */
  let sharedWorkerDelays: Record<string, number>;
  /** Sessions of shared workers (from `Target.attachedToTarget`). */
  let sharedWorkerSessions: Set<string>;

  const url = (path: string) => `${site.url}${path}`;
  /** The cross-site iframe's origin (same server). */
  const frameUrl = (path: string) => `http://localhost:${new URL(site.url).port}${path}`;
  const entryAt = (u: string): ResourceEntry | undefined => interception.listResources().find((r) => r.url === u);
  const entry = (path: string) => entryAt(url(path));
  const detachedIds = () => events.flatMap((e) => (e.type === 'worker-detached' ? [e.workerId] : []));
  const missed = () => events.filter((e) => e.type === 'override-missed');
  const served = (path: string) => events.some((e) => e.type === 'override-served' && e.url === url(path));

  beforeAll(async () => {
    site = await startFixtureSite();
    site.server.on('request', (req) => {
      const path = new URL(req.url ?? '/', 'http://localhost').pathname;
      hits?.set(path, (hits.get(path) ?? 0) + 1);
    });
    chrome = await launchChromium();
    // Only disconnects Playwright (see above); the harness still closes the browser.
    await chrome.browser.close();
    const { product } = await chrome.connection.send<{ product: string }>('Browser.getVersion');
    chromeVersion = Number(/\/(\d+)\./.exec(product)?.[1]);
  });

  afterAll(async () => {
    await chrome?.close();
    await site?.close();
  });

  beforeEach(async () => {
    fallbackFetches = [];
    overrides = [];
    settings = { ...DEFAULT_SETTINGS };
    events = [];
    hits = new Map();
    sent = [];
    sharedWorkerDelays = {};
    ({ browserContextId } = await chrome.connection.send<{ browserContextId: string }>('Target.createBrowserContext'));
    const { targetId } = await chrome.connection.send<{ targetId: string }>('Target.createTarget', { url: 'about:blank', browserContextId });
    transport = await attachToPage(chrome.connection, targetId);
    // Subscribed before the engine, so a session is known as a shared worker's by the time the engine sets it up.
    sharedWorkerSessions = new Set();
    transport.on('Target.attachedToTarget', (p: { sessionId: string; targetInfo: { type: string } }) => {
      if (p.targetInfo.type === 'shared_worker') sharedWorkerSessions.add(p.sessionId);
    });
    const engineTransport: CdpTransport = {
      send: (method, params, sessionId) => {
        sent.push({ method, sessionId });
        const delay = sessionId && sharedWorkerSessions.has(sessionId) ? sharedWorkerDelays[method] : undefined;
        if (!delay) return transport.send(method, params, sessionId);
        return new Promise((r) => setTimeout(r, delay)).then(() => transport.send(method, params, sessionId));
      },
      on: (event, handler) => transport.on(event, handler),
    };
    interception = new PageInterception({
      transport: engineTransport,
      getOverrides: () => overrides,
      getSettings: () => settings,
      emit: (e) => events.push(e),
      fallbackFetch: async (u) => {
        fallbackFetches.push(u);
        return (await fetch(u)).text();
      },
    });
    await interception.attach();
  });

  afterEach(async () => {
    interception.detach();
    await transport.detach();
    await chrome.connection.send('Target.disposeBrowserContext', { browserContextId });
  });

  async function setOverrides(next: Override[]): Promise<void> {
    overrides = next;
    await interception.refreshInterception();
  }

  async function evaluate<T>(expression: string): Promise<T> {
    const r = await transport.send<{ result: { value: T }; exceptionDetails?: { text: string } }>('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result.value;
  }

  /** Sends a navigation command and waits for the page's load event. */
  async function load(method: 'Page.navigate' | 'Page.reload', params: Record<string, unknown> = {}): Promise<void> {
    let off = () => {};
    const loaded = new Promise<void>((resolve) => {
      off = transport.on('Page.loadEventFired', (_, sessionId) => {
        if (!sessionId) resolve();
      });
    });
    try {
      await transport.send(method, params);
      await loaded;
    } finally {
      off();
    }
  }
  const goto = (path: string) => load('Page.navigate', { url: url(path) });
  const reload = () => load('Page.reload');

  /** Waits for a worker to report `key` to the page, and returns what it reported. */
  const result = (key: ResultKey) => waitFor(() => evaluate<string | undefined>(`window.workerResults?.${key}`).catch(() => undefined));

  /** Opens the fixture page and waits until every worker has reported. */
  async function openWorkers(): Promise<void> {
    await goto('/workers/');
    for (const key of Object.keys(ORIGINAL_RESULTS) as ResultKey[]) await result(key);
  }

  /** Asks the registration's active service worker what it runs now (undefined if none answers within a second). */
  const pingServiceWorker = () =>
    evaluate<string | undefined>(`new Promise((resolve) => {
      navigator.serviceWorker.addEventListener('message', (e) => resolve(e.data.sw), { once: true });
      setTimeout(resolve, 1000);
      navigator.serviceWorker.getRegistration('/workers/').then((r) => r.active.postMessage('ping'));
    })`);

  /**
   * Serves the shared worker's first script unchanged. Over a socket the
   * shared worker can start before its session is set up unless that script
   * is held, which happens only when an override pauses it.
   */
  async function holdSharedWorker(): Promise<Override> {
    const upstream = await (await fetch(url('/workers/shared.js'))).text();
    return makeOverride({ kind: 'Script', sourceUrl: url('/workers/shared.js'), content: upstream });
  }

  it('runs every kind of worker while intercepting (none is left paused)', async () => {
    await openWorkers();
    expect(await evaluate('window.workerResults')).toEqual(ORIGINAL_RESULTS);
    const types = interception.targets().map((t) => t.type);
    // The worker, its nested worker and the module worker.
    expect(types.filter((t) => t === 'worker')).toHaveLength(3);
    expect(types).toEqual(expect.arrayContaining(['shared_worker', 'service_worker', 'worklet']));
    expect(events.filter((e) => e.type === 'error')).toEqual([]);
  });

  it("serves edited files a dedicated worker imports (importScripts and a module's static import)", async () => {
    await setOverrides([
      makeOverride({ kind: 'Script', sourceUrl: url('/workers/lib.js'), content: WORKER_LIB_JS.replace('original', 'patched') }),
      makeOverride({ kind: 'Script', sourceUrl: url('/workers/dep.js'), content: MODULE_DEP_JS.replace('original', 'patched') }),
    ]);
    await goto('/workers/');
    expect(await result('worker')).toBe('patched-lib');
    expect(await result('module')).toBe('patched-dep');
    // Served on the page's session, listed from the worker's.
    await waitFor(() => entry('/workers/lib.js') && entry('/workers/dep.js'));
    expect(entry('/workers/lib.js')?.overrideId).toBe(overrides[0].id);
    expect(entry('/workers/dep.js')?.overrideId).toBe(overrides[1].id);
    expect(missed()).toEqual([]);
  });

  it("serves a worker's own edited first script (classic and module)", async () => {
    await setOverrides([
      makeOverride({
        kind: 'Script',
        sourceUrl: url('/workers/worker.js'),
        content: "importScripts('/workers/lib.js');\npostMessage({ key: 'worker', value: 'patched-main+' + self.libValue });\n",
      }),
      makeOverride({ kind: 'Script', sourceUrl: url('/workers/module.js'), content: "postMessage('patched-module');\n" }),
    ]);
    await goto('/workers/');
    expect(await result('worker')).toBe('patched-main+original-lib');
    expect(await result('module')).toBe('patched-module');
    await waitFor(() => entry('/workers/worker.js') && entry('/workers/module.js'));
    expect(entry('/workers/worker.js')).toMatchObject({ overrideId: overrides[0].id, worker: { type: 'worker', url: url('/workers/worker.js') } });
    expect(entry('/workers/module.js')?.overrideId).toBe(overrides[1].id);
    expect(missed()).toEqual([]);
  });

  it('serves an edited file that a nested worker imports', async () => {
    await setOverrides([
      makeOverride({ kind: 'Script', sourceUrl: url('/workers/nested-lib.js'), content: NESTED_LIB_JS.replace('original', 'patched') }),
    ]);
    await goto('/workers/');
    expect(await result('nested')).toBe('original-nested:patched-nested-lib');
  });

  it("serves a nested worker's edited first script, or reports that it couldn't (Chromium 152+ pauses it nowhere)", async () => {
    const nested = url('/workers/nested.js');
    await setOverrides([makeOverride({ kind: 'Script', sourceUrl: nested, content: NESTED_WORKER_JS.replace("'original-nested:'", "'patched-nested:'") })]);
    await goto('/workers/');
    const value = await result('nested');
    if (value.startsWith('patched-nested:')) {
      // Chromium 141 pauses it on the page's session.
      await waitFor(() => entry('/workers/nested.js'));
      expect(entry('/workers/nested.js')?.overrideId).toBe(overrides[0].id);
      expect(missed()).toEqual([]);
    } else {
      expect(value).toBe(ORIGINAL_RESULTS.nested);
      await waitFor(() => missed().length > 0);
      expect(missed()).toEqual([{ type: 'override-missed', overrideId: overrides[0].id, url: nested, reason: 'nested-worker' }]);
    }
  });

  /** Edits of the shared worker's first script and of what it imports. */
  const sharedWorkerEdits = () => [
    makeOverride({
      kind: 'Script',
      sourceUrl: url('/workers/shared.js'),
      content: "importScripts('/workers/shared-lib.js');\nonconnect = (e) => e.ports[0].postMessage('patched-shared+' + self.sharedLibValue);\n",
    }),
    makeOverride({ kind: 'Script', sourceUrl: url('/workers/shared-lib.js'), content: SHARED_LIB_JS.replace('original', 'patched') }),
  ];

  it('serves edited files to a shared worker (its first script and what it imports)', async () => {
    await setOverrides(sharedWorkerEdits());
    await goto('/workers/');
    expect(await result('shared')).toBe('patched-shared+patched-shared-lib');
    expect(served('/workers/shared.js') && served('/workers/shared-lib.js')).toBe(true);
  });

  // Over a socket, a shared worker's session usually intercepts before the worker starts anyway. With its Fetch.enable
  // late, only the hold (its first script waiting on the page's session) keeps its import from going out unpaused.
  it("holds a shared worker's first script until its session intercepts (its Fetch.enable made late)", async () => {
    sharedWorkerDelays = { 'Fetch.enable': 300 };
    await setOverrides(sharedWorkerEdits());
    await goto('/workers/');
    expect(await result('shared')).toBe('patched-shared+patched-shared-lib');
    expect(sent.some((c) => c.method === 'Fetch.enable' && sharedWorkerSessions.has(c.sessionId ?? ''))).toBe(true);
  });

  it("serves a service worker's edited script and what it imports", async () => {
    await setOverrides([
      makeOverride({ kind: 'Script', sourceUrl: url('/workers/sw.js'), content: SW_JS.replace("'original-sw:'", "'patched-sw:'") }),
      makeOverride({ kind: 'Script', sourceUrl: url('/workers/sw-lib.js'), content: SW_LIB_JS.replace('original', 'patched') }),
    ]);
    await goto('/workers/');
    expect(await result('sw')).toBe('patched-sw:patched-sw-lib');
    await waitFor(() => entry('/workers/sw.js') && entry('/workers/sw-lib.js'));
    expect(entry('/workers/sw.js')?.overrideId).toBe(overrides[0].id);
    expect(entry('/workers/sw-lib.js')?.overrideId).toBe(overrides[1].id);
    expect(missed()).toEqual([]);
  });

  it('serves an edited worklet module', async () => {
    await setOverrides([
      makeOverride({ kind: 'Script', sourceUrl: url('/workers/worklet.js'), content: WORKLET_JS.replace('original-processor', 'patched-processor') }),
    ]);
    await goto('/workers/');
    expect(await result('worklet')).toBe('patched');
  });

  it('lists what every worker loaded, labelled with the worker and its session', async () => {
    await openWorkers();
    // A shared worker's files are covered by the next tests.
    const paths = ['worker.js', 'lib.js', 'nested.js', 'nested-lib.js', 'module.js', 'dep.js', 'sw.js', 'sw-lib.js', 'worklet.js'];
    await waitFor(() => paths.every((p) => entry(`/workers/${p}`)));

    expect(entry('/workers/')?.worker).toBeUndefined();
    const labels = Object.fromEntries(paths.map((p) => [p, { kind: entry(`/workers/${p}`)?.kind, ...entry(`/workers/${p}`)?.worker }]));
    const script = (type: string, path: string) => ({ kind: 'Script', type, url: url(path) });
    expect(labels).toEqual({
      'worker.js': script('worker', '/workers/worker.js'),
      'lib.js': script('worker', '/workers/worker.js'),
      'nested.js': script('worker', '/workers/nested.js'),
      'nested-lib.js': script('worker', '/workers/nested.js'),
      'module.js': script('worker', '/workers/module.js'),
      'dep.js': script('worker', '/workers/module.js'),
      'sw.js': script('service_worker', '/workers/sw.js'),
      'sw-lib.js': script('service_worker', '/workers/sw.js'),
      // A worklet's URL is its document's.
      'worklet.js': script('worklet', '/workers/'),
    });

    // Each entry names the live session of its own worker.
    const sessions = new Map(interception.targets().map((t) => [t.sessionId, t.type]));
    for (const p of paths) expect(sessions.get(entry(`/workers/${p}`)?.workerId ?? '')).toBe(entry(`/workers/${p}`)?.worker?.type);
    expect(entry('/workers/lib.js')?.workerId).toBe(entry('/workers/worker.js')?.workerId);
    expect(entry('/workers/nested-lib.js')?.workerId).not.toBe(entry('/workers/lib.js')?.workerId);
    expect(entry('/workers/dep.js')?.workerId).not.toBe(entry('/workers/lib.js')?.workerId);
  });

  it("lists a shared worker's own script", async () => {
    await setOverrides([await holdSharedWorker()]);
    await openWorkers();
    // Chromium 152+ tells a shared worker's session when its script has loaded (Inspector.workerScriptLoaded). 141
    // never does: there the script is listed from its loadingFinished, which that session reports only if it was
    // set up in time.
    if (chromeVersion < 152 && !(await waitFor(() => entry('/workers/shared.js'), 2000).catch(() => undefined))) return;
    const shared = await waitFor(() => entry('/workers/shared.js'));
    expect(shared).toMatchObject({ kind: 'Script', worker: { type: 'shared_worker', url: url('/workers/shared.js') } });
    expect(interception.targets().find((t) => t.sessionId === shared.workerId)?.type).toBe('shared_worker');
  });

  it('lists what a shared worker imports as it starts', async () => {
    await setOverrides([await holdSharedWorker()]);
    await openWorkers();
    const lib = await waitFor(() => entry('/workers/shared-lib.js'));
    expect(lib).toMatchObject({ kind: 'Script', worker: { type: 'shared_worker', url: url('/workers/shared.js') } });
  });

  // Nothing pauses a shared worker as it starts, so its session may start reporting (Network.enable) only after the
  // worker's first importScripts went out, and then never reports it: its scripts are listed from their pauses.
  it("lists what a shared worker imports before its session reports anything (its Network.enable made late)", async () => {
    sharedWorkerDelays = { 'Network.enable': 300 };
    await setOverrides([await holdSharedWorker()]);
    await openWorkers();
    const lib = await waitFor(() => entry('/workers/shared-lib.js'));
    expect(lib).toMatchObject({ kind: 'Script', worker: { type: 'shared_worker', url: url('/workers/shared.js') } });
    expect(sharedWorkerSessions.has(lib.workerId ?? '')).toBe(true);
  });

  it("reads a worker's files through its own session", async () => {
    await openWorkers();
    const files: Array<[string, string]> = [
      ['/workers/lib.js', WORKER_LIB_JS],
      ['/workers/dep.js', MODULE_DEP_JS],
      ['/workers/sw-lib.js', SW_LIB_JS],
    ];
    for (const [path, body] of files) {
      await waitFor(() => entry(path));
      const content = await interception.getResourceContent(url(path));
      expect(content.content).toBe(body);
      expect(content.hash).toBe(sha256(body));
    }
    // Not downloaded again.
    expect(fallbackFetches).toEqual([]);
    // A service worker's own script is reported on its session too, but Chromium may keep no body for it (then it's
    // downloaded again).
    await waitFor(() => entry('/workers/sw.js'));
    expect((await interception.getResourceContent(url('/workers/sw.js'))).content).toBe(SW_JS);
  });

  it('reports a worker gone when it terminates or the page navigates away', async () => {
    await openWorkers();
    await waitFor(() => entry('/workers/lib.js') && entry('/workers/nested-lib.js') && entry('/workers/dep.js') && entry('/workers/worklet.js'));
    const workerId = entry('/workers/lib.js')!.workerId!;
    const nestedId = entry('/workers/nested-lib.js')!.workerId!;

    await evaluate('worker.terminate()');
    // Its nested worker goes with it.
    await waitFor(() => detachedIds().includes(workerId) && detachedIds().includes(nestedId));
    expect(interception.listResources().filter((r) => r.workerId === workerId || r.workerId === nestedId)).toEqual([]);

    const moduleId = entry('/workers/dep.js')!.workerId!;
    const workletId = entry('/workers/worklet.js')!.workerId!;
    await goto('/');
    await waitFor(() => detachedIds().includes(moduleId) && detachedIds().includes(workletId));
    expect(interception.targets().filter((t) => t.type === 'worker' || t.type === 'worklet')).toEqual([]);
    expect(events.filter((e) => e.type === 'error')).toEqual([]);
  });

  it('serves and lists what workers under a cross-site iframe load, and drops them when the page reloads or leaves', async () => {
    const lib = frameUrl('/workers/lib.js');
    await setOverrides([makeOverride({ kind: 'Script', sourceUrl: lib, content: WORKER_LIB_JS.replace('original', 'patched') })]);
    await goto('/workers-frame/');
    expect(await result('worker')).toBe('patched-lib');
    expect(await result('nested')).toBe(ORIGINAL_RESULTS.nested);
    // Paused and served on the iframe's session.
    const iframe = await waitFor(() => interception.targets().find((t) => t.type === 'iframe'));
    expect(sent.filter((c) => c.method === 'Fetch.fulfillRequest').map((c) => c.sessionId)).toEqual([iframe.sessionId]);
    expect(missed()).toEqual([]);

    /** The live sessions of the iframe's worker and of its nested worker, once both listed what they loaded. */
    const frameWorkers = () =>
      waitFor(() => {
        const ids = [entryAt(lib)?.workerId, entryAt(frameUrl('/workers/nested-lib.js'))?.workerId];
        return ids.every((id) => id && !detachedIds().includes(id)) ? (ids as [string, string]) : undefined;
      });
    const [workerId, nestedId] = await frameWorkers();
    const paths = ['worker.js', 'lib.js', 'nested.js', 'nested-lib.js'];
    await waitFor(() => paths.every((p) => entryAt(frameUrl(`/workers/${p}`))));
    const labels = Object.fromEntries(paths.map((p) => [p, { ...entryAt(frameUrl(`/workers/${p}`))?.worker, id: entryAt(frameUrl(`/workers/${p}`))?.workerId }]));
    expect(labels).toEqual({
      'worker.js': { type: 'worker', url: frameUrl('/workers/worker.js'), id: workerId },
      'lib.js': { type: 'worker', url: frameUrl('/workers/worker.js'), id: workerId },
      'nested.js': { type: 'worker', url: frameUrl('/workers/nested.js'), id: nestedId },
      'nested-lib.js': { type: 'worker', url: frameUrl('/workers/nested.js'), id: nestedId },
    });
    expect(entryAt(lib)?.overrideId).toBe(overrides[0].id);
    // The worker attached through the iframe's session, its nested worker through the worker's.
    const targets = new Map(interception.targets().map((t) => [t.sessionId, t]));
    expect(targets.get(workerId)?.parentTargetId).toBe(iframe.targetId);
    expect(targets.get(nestedId)?.parentTargetId).toBe(targets.get(workerId)?.targetId);

    // Chromium reports the iframe's session gone, but not always its workers' (never the nested one's): their removal
    // cascades from it.
    const gone = async (ids: string[]) => {
      await waitFor(() => ids.every((id) => detachedIds().includes(id)));
      expect(interception.listResources().filter((r) => ids.includes(r.workerId ?? ''))).toEqual([]);
      expect(interception.targets().filter((t) => ids.includes(t.sessionId))).toEqual([]);
    };
    await reload();
    await gone([workerId, nestedId]);
    expect(events).toContainEqual({ type: 'iframe-detached', iframeId: iframe.sessionId });
    expect(await result('worker')).toBe('patched-lib');
    const reloaded = await frameWorkers();
    await goto('/');
    await gone(reloaded);
    expect(interception.targets()).toEqual([]);
    expect(events.filter((e) => e.type === 'error')).toEqual([]);
  });

  it('applies an edit to an installed service worker on the next reload, and keeps it', async () => {
    await openWorkers();
    await setOverrides([makeOverride({ kind: 'Script', sourceUrl: url('/workers/sw-lib.js'), content: SW_LIB_JS.replace('original', 'patched') })]);
    // As the app reloads: an outdated service worker unregisters, and the page's register() installs it afresh.
    const appReload = async () => {
      await interception.prepareReload();
      await reload();
    };
    await appReload();
    expect(await result('sw')).toBe('original-sw:patched-sw-lib');
    const installs = hits.get('/workers/sw.js');
    await appReload();
    expect(await result('sw')).toBe('original-sw:patched-sw-lib');
    // Up to date, so left installed.
    expect(hits.get('/workers/sw.js')).toBe(installs);
    expect(missed()).toEqual([]);
  });

  it.each([
    ['sw-lib.js', SW_LIB_JS.replace('original', 'patched'), 'original-sw:patched-sw-lib'],
    ['sw.js', SW_JS.replace("'original-sw:'", "'patched-sw:'"), 'patched-sw:original-sw-lib'],
  ])("reports the page's update check reinstalling the live %s, and reinstalls the edit on the next app reload", async (file, content, patched) => {
    const path = `/workers/${file}`;
    await setOverrides([makeOverride({ kind: 'Script', sourceUrl: url(path), content })]);
    await goto('/workers/');
    expect(await result('sw')).toBe(patched);
    const installed = await waitFor(() => entry('/workers/sw.js')?.workerId);
    // Chromium's update check fetches the scripts where no session pauses them, and installs a new version.
    await evaluate(`navigator.serviceWorker.getRegistration('/workers/').then((r) => r.update()).then(() => true)`);
    await waitFor(() => missed().length > 0);
    expect(missed()).toEqual([{ type: 'override-missed', overrideId: overrides[0].id, url: url(path), reason: 'service-worker-update' }]);
    // It activates on its own (skipWaiting) once the old version is done; pinging the old one meanwhile would start it
    // again and keep it busy, holding the new one back.
    await waitFor(() => evaluate<boolean>(`navigator.serviceWorker.getRegistration('/workers/').then((r) => !r.installing && !r.waiting)`));
    expect(await pingServiceWorker()).toBe(ORIGINAL_RESULTS.sw);
    // Listed by the new version's session as it was fetched, its script once (not again as it starts).
    const update = await waitFor(() => interception.listResources().find((r) => r.url === url(path) && r.workerId !== installed));
    expect(update).toMatchObject({ kind: 'Script', worker: { type: 'service_worker', url: url('/workers/sw.js') } });
    expect(update.overrideId).toBeUndefined();
    const listings = events.filter((e) => e.type === 'resource' && e.resource.url === url('/workers/sw.js') && e.resource.workerId === update.workerId);
    expect(listings).toHaveLength(1);

    const installs = hits.get('/workers/sw.js') ?? 0;
    await interception.prepareReload();
    await reload();
    expect(await result('sw')).toBe(patched);
    expect(hits.get('/workers/sw.js')).toBe(installs + 1);
    expect(missed()).toHaveLength(1);
    expect(events.filter((e) => e.type === 'error')).toEqual([]);
  });

  it("knows the update check installed the live sw.js: with the edit then turned off, the app's reload leaves it installed", async () => {
    await setOverrides([makeOverride({ kind: 'Script', sourceUrl: url('/workers/sw.js'), content: SW_JS.replace("'original-sw:'", "'patched-sw:'") })]);
    await goto('/workers/');
    expect(await result('sw')).toBe('patched-sw:original-sw-lib');
    await evaluate(`navigator.serviceWorker.getRegistration('/workers/').then((r) => r.update()).then(() => true)`);
    await waitFor(() => missed().length > 0);
    await waitFor(() => evaluate<boolean>(`navigator.serviceWorker.getRegistration('/workers/').then((r) => !r.installing && !r.waiting)`));

    await setOverrides([{ ...overrides[0], enabled: false }]);
    const installs = hits.get('/workers/sw.js');
    await interception.prepareReload();
    await reload();
    expect(await result('sw')).toBe(ORIGINAL_RESULTS.sw);
    expect(hits.get('/workers/sw.js')).toBe(installs);
  });

  it('lists a service worker again when the page comes back to its site, and leaves it installed while up to date', async () => {
    await setOverrides([makeOverride({ kind: 'Script', sourceUrl: url('/workers/sw-lib.js'), content: SW_LIB_JS.replace('original', 'patched') })]);
    await goto('/workers/');
    expect(await result('sw')).toBe('original-sw:patched-sw-lib');
    const swPaths = ['/workers/sw.js', '/workers/sw-lib.js'];
    await waitFor(() => swPaths.every((p) => entry(p)));
    const before = entry('/workers/sw.js')!.workerId!;
    const worker = interception.targets().find((t) => t.sessionId === before)!;
    const listed = (workerId: string) => interception.listResources().filter((r) => r.workerId === workerId);
    const firstListing = listed(before);

    // Leaving its site detaches it; coming back attaches the same worker (installed, not fetched again) on a new session.
    await load('Page.navigate', { url: frameUrl('/frames/nested.html') });
    await waitFor(() => detachedIds().includes(before));
    await goto('/workers/');
    expect(await result('sw')).toBe('original-sw:patched-sw-lib');
    const after = await waitFor(() => interception.targets().find((t) => t.type === 'service_worker' && t.sessionId !== before));
    expect(after.targetId).toBe(worker.targetId);
    await waitFor(() => listed(after.sessionId).length === firstListing.length || undefined);
    expect(listed(after.sessionId)).toEqual(firstListing.map((r) => ({ ...r, workerId: after.sessionId })));
    expect(entry('/workers/sw-lib.js')?.overrideId).toBe(overrides[0].id);

    // Its edit is known to be installed: the app's reload leaves it be.
    const installs = hits.get('/workers/sw.js');
    await interception.prepareReload();
    await reload();
    expect(await result('sw')).toBe('original-sw:patched-sw-lib');
    expect(hits.get('/workers/sw.js')).toBe(installs);
    expect(interception.targets().find((t) => t.type === 'service_worker')?.sessionId).toBe(after.sessionId);
    expect(missed()).toEqual([]);
  });

  it('applies the settings to what workers load (a disabled cache to their imports)', async () => {
    const workerFiles = ['/workers/worker.js', '/workers/lib.js', '/workers/nested.js', '/workers/nested-lib.js', '/workers/dep.js'];
    const fetches = () => Object.fromEntries(workerFiles.map((p) => [p, hits.get(p)]));
    const reloadWorkers = async () => {
      await reload();
      await result('nested');
      await result('module');
    };
    // The site marks every file immutable: with the cache on, nothing is fetched twice.
    settings = { ...settings, disableCache: false };
    await interception.applySettings();
    await openWorkers();
    await reloadWorkers();
    expect(fetches()).toEqual(Object.fromEntries(workerFiles.map((p) => [p, 1])));

    settings = { ...settings, disableCache: true };
    await interception.applySettings();
    await reloadWorkers();
    expect(fetches()).toEqual(Object.fromEntries(workerFiles.map((p) => [p, 2])));
  });
});
