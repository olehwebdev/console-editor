import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { WebContents } from 'electron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageController } from '../../src/main/PageController';
import { OverrideStore } from '../../src/main/store/OverrideStore';
import { RuleStore } from '../../src/main/store/RuleStore';
import { SessionStore } from '../../src/main/store/SessionStore';
import { WorkspaceController } from '../../src/main/WorkspaceController';
import type { AppEvent } from '../../src/shared/types';

let dir: string;
let session: SessionStore;
let store: OverrideStore;
let rules: RuleStore;
let events: AppEvent[];
let calls: string[];
let favicon: string | null;
const wc = Object.assign(new EventEmitter(), { url: '', getURL: () => wc.url });

/** Records what the page is asked to do, in order with the stores' changes. */
const page = {
  leave: vi.fn(async () => {
    calls.push(`leave (active ${session.activeId})`);
  }),
  navigate: vi.fn(async (url: string, options?: { fresh?: boolean }) => {
    calls.push(`navigate ${url}${options?.fresh ? ' fresh' : ''}`);
  }),
  overridesChanged: vi.fn(async () => {
    // One pattern refresh reads both stores: both must already show the new workspace.
    const ruled = rules.list().map((r) => r.match.pattern);
    calls.push(`serve ${store.list().map((o) => o.sourceUrl).join(',')}${ruled.length ? ` rules ${ruled.join(',')}` : ''}`);
  }),
  rulesChanged: vi.fn(async (patterns = true) => {
    calls.push(`rules ${patterns}${patterns === false ? ' (event)' : ''}`);
  }),
  fetchFavicon: vi.fn(async () => favicon),
};

let workspaces: WorkspaceController;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'console-editor-workspaces-'));
  session = new SessionStore(join(dir, 'session'));
  store = new OverrideStore(join(dir, 'workspace'));
  rules = new RuleStore(join(dir, 'workspace'));
  await Promise.all([session.load(), store.load(), rules.load()]);
  events = [];
  calls = [];
  favicon = null;
  wc.removeAllListeners();
  vi.clearAllMocks();
  workspaces = new WorkspaceController(page as unknown as PageController, session, store, rules, (e) => events.push(e));
  await workspaces.start();
  workspaces.watch(wc as unknown as WebContents);
});

afterEach(async () => {
  vi.useRealTimers();
  await rm(dir, { recursive: true, force: true });
});

const override = (url: string) => store.create({ kind: 'Script', sourceUrl: url, content: 'x', originalHash: null });
const rule = (url: string) => rules.create({ action: 'block', match: { type: 'exact', pattern: url, ignoreQuery: true }, resourceTypes: [] });
const navigated = (url: string) => {
  wc.url = url;
  wc.emit('did-navigate', {}, url);
};

describe('WorkspaceController', () => {
  it("switches: the page leaves first, then the other workspace's overrides are served and its page loads", async () => {
    const first = session.activeId;
    navigated('https://a.com/');
    await override('https://a.com/a.js');
    const second = await workspaces.create();

    await workspaces.switchTo(second.id);
    expect(calls).toEqual([`leave (active ${first})`, 'serve ', 'rules false (event)']);
    expect(events.at(-1)).toEqual({ type: 'workspaces-changed', state: expect.objectContaining({ activeId: second.id }) });

    calls = [];
    await workspaces.switchTo(first);
    expect(calls).toEqual([`leave (active ${second.id})`, 'serve https://a.com/a.js', 'rules false (event)', 'navigate https://a.com/ fresh']);
  });

  it('switches whole even when writing which one is active fails', async () => {
    await override('https://a.com/a.js');
    const second = await workspaces.create();
    vi.spyOn(session, 'setActive').mockImplementationOnce(function (this: SessionStore, id: unknown) {
      SessionStore.prototype.setActive.call(this, id);
      return Promise.reject(new Error('disk full'));
    });
    await expect(workspaces.switchTo(second.id)).rejects.toThrow('disk full');
    // Everything moved together: the session, the overrides served and the rules applied.
    expect(session.activeId).toBe(second.id);
    expect(store.list()).toEqual([]);
    expect(rules.list()).toEqual([]);
  });

  it('deletes the overrides before the workspace, so a failure never hands them to another', async () => {
    const first = session.activeId;
    const second = await workspaces.create();
    await workspaces.switchTo(second.id);
    await override('https://b.com/b.js');
    await workspaces.switchTo(first);

    vi.spyOn(store, 'removeWorkspace').mockRejectedValueOnce(new Error('EACCES'));
    await expect(workspaces.remove(second.id)).rejects.toThrow('EACCES');
    expect(session.has(second.id)).toBe(true);

    await workspaces.remove(second.id);
    expect(session.has(second.id)).toBe(false);
    store.setWorkspace(second.id);
    expect(store.list()).toEqual([]);
    await expect(workspaces.remove(first)).rejects.toThrow(/in use/);
  });

  it("switches the rules applied with the overrides, in the same step, before the pattern refresh", async () => {
    const first = session.activeId;
    await rule('https://a.com/ads.js');
    const second = await workspaces.create();
    await workspaces.switchTo(second.id);
    await rule('https://b.com/ads.js');
    calls = [];
    await workspaces.switchTo(first);
    expect(calls).toEqual([`leave (active ${second.id})`, 'serve  rules https://a.com/ads.js', 'rules false (event)']);
    calls = [];
    await workspaces.switchTo(second.id);
    expect(calls).toEqual([`leave (active ${first})`, 'serve  rules https://b.com/ads.js', 'rules false (event)']);
  });

  it('hands rules of no known workspace to the active one at start, before anything is served', async () => {
    const orphan = await rule('https://a.com/ads.js');
    const index = JSON.parse(await readFile(join(dir, 'workspace', 'rules.json'), 'utf8'));
    index.rules[0].workspaceId = 'gone0000';
    await writeFile(join(dir, 'workspace', 'rules.json'), JSON.stringify(index));

    const reloaded = new RuleStore(join(dir, 'workspace'));
    await reloaded.load();
    const restarted = new WorkspaceController(page as unknown as PageController, session, store, reloaded, (e) => events.push(e));
    await restarted.start();
    expect(reloaded.list().map((r) => r.id)).toEqual([orphan.id]);
    expect(reloaded.get(orphan.id).workspaceId).toBe(session.activeId);
  });

  it('deletes the rules after the overrides and before the workspace, so a failure never hands them to another', async () => {
    const first = session.activeId;
    const second = await workspaces.create();
    await workspaces.switchTo(second.id);
    await override('https://b.com/b.js');
    await rule('https://b.com/ads.js');
    await workspaces.switchTo(first);

    const order: string[] = [];
    vi.spyOn(store, 'removeWorkspace').mockImplementationOnce(async function (this: OverrideStore, id: string) {
      order.push('overrides');
      return OverrideStore.prototype.removeWorkspace.call(this, id);
    });
    vi.spyOn(rules, 'removeWorkspace').mockImplementationOnce(async () => {
      order.push('rules');
      throw new Error('EACCES');
    });
    await expect(workspaces.remove(second.id)).rejects.toThrow('EACCES');
    expect(order).toEqual(['overrides', 'rules']);
    expect(session.has(second.id)).toBe(true);

    await workspaces.remove(second.id);
    expect(session.has(second.id)).toBe(false);
    rules.setWorkspace(second.id);
    expect(rules.list()).toEqual([]);
  });

  it("keeps each workspace's last page title, once it settles, across a switch", async () => {
    vi.useFakeTimers();
    const first = session.activeId;
    const second = await workspaces.create();
    wc.url = 'https://a.com/';
    wc.emit('page-title-updated', {}, 'A (1)');
    wc.emit('page-title-updated', {}, 'A (2)');
    await workspaces.switchTo(second.id);
    wc.url = 'https://b.com/';
    wc.emit('page-title-updated', {}, 'B');
    await vi.advanceTimersByTimeAsync(1100);
    expect(session.titleOf(first)).toBe('A (2)');
    expect(session.titleOf(second.id)).toBe('B');
  });

  it('keeps a favicon for the workspace that showed the page, while it is still on that site', async () => {
    const first = session.activeId;
    navigated('https://a.com/');
    favicon = 'data:image/png;base64,AAAA';
    wc.emit('page-favicon-updated', {}, ['https://a.com/favicon.ico']);
    await vi.waitFor(() => expect(session.favicon(first)).toBe(favicon));
    expect(events).toContainEqual({ type: 'workspace-favicon', id: first, favicon });

    // Moving to another site drops it at once; an icon the old site reports late isn't taken.
    let answer: (icon: string) => void = () => undefined;
    page.fetchFavicon.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
    wc.emit('page-favicon-updated', {}, ['https://a.com/other.ico']);
    navigated('https://b.com/');
    expect(events).toContainEqual({ type: 'workspace-favicon', id: first, favicon: null });
    answer('data:image/png;base64,BBBB');
    await new Promise((r) => setTimeout(r, 10));
    expect(session.favicon(first)).toBeNull();
  });
});
