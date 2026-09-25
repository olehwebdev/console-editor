import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OverrideStore } from '../../src/main/store/OverrideStore';
import { SettingsStore } from '../../src/main/store/SettingsStore';
import { DEFAULT_SETTINGS } from '../../src/shared/types';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'console-editor-test-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('OverrideStore', () => {
  const input = {
    kind: 'Script' as const,
    sourceUrl: 'https://a.com/app.js?v=3',
    content: 'patched();',
    base: 'original();',
    originalHash: 'abc',
  };

  it('creates overrides with a default exact matcher that ignores the query', async () => {
    const store = new OverrideStore(dir);
    await store.load();
    const o = await store.create(input);
    expect(o.match).toEqual({ type: 'exact', pattern: 'https://a.com/app.js', ignoreQuery: true });
    expect(o.enabled).toBe(true);
    expect(await readFile(join(dir, 'files', `${o.id}.js`), 'utf8')).toBe('patched();');
    expect(await readFile(join(dir, 'files', `${o.id}.base.js`), 'utf8')).toBe('original();');
  });

  it('persists across instances', async () => {
    const a = new OverrideStore(dir);
    await a.load();
    const o = await a.create(input);
    await a.update(o.id, { content: 'v2();', enabled: false, match: { type: 'glob', pattern: 'https://a.com/*.js', ignoreQuery: true } });

    const b = new OverrideStore(dir);
    await b.load();
    const loaded = b.get(o.id);
    expect(loaded.content).toBe('v2();');
    expect(await b.base(o.id)).toBe('original();');
    expect(loaded.enabled).toBe(false);
    expect(loaded.match.type).toBe('glob');
  });

  it('uses the content as the diff base when none is sent, without storing it twice', async () => {
    const store = new OverrideStore(dir);
    await store.load();
    const { base: _base, ...withoutBase } = input;
    const o = await store.create(withoutBase);
    expect(await store.base(o.id)).toBe('patched();');
    expect(await readdir(join(dir, 'files'))).toEqual([`${o.id}.js`]);
    expect(store.meta(o.id)).not.toHaveProperty('content');
    // The engine only needs the content: the base is not kept in memory.
    expect(store.get(o.id)).not.toHaveProperty('base');
  });

  it('keeps memory unchanged when a write fails (no ghost overrides, no unsaved content served)', async () => {
    const store = new OverrideStore(dir);
    await store.load();
    const o = await store.create(input);
    // Make every content write fail: the files folder becomes a plain file.
    await rm(join(dir, 'files'), { recursive: true });
    await writeFile(join(dir, 'files'), '');
    await expect(store.create({ ...input, content: 'ghost();' })).rejects.toThrow();
    await expect(store.update(o.id, { content: 'unsaved();' })).rejects.toThrow();
    expect(store.list().map((x) => x.content)).toEqual(['patched();']);
    // Later changes still go through.
    await store.update(o.id, { enabled: false });
    expect(store.get(o.id).enabled).toBe(false);
  });

  it('applies queued updates on top of each other', async () => {
    const store = new OverrideStore(dir);
    await store.load();
    const o = await store.create(input);
    await Promise.all([store.update(o.id, { content: 'v2();' }), store.update(o.id, { enabled: false })]);
    expect(store.get(o.id)).toMatchObject({ content: 'v2();', enabled: false });
  });

  it('removes files on delete', async () => {
    const store = new OverrideStore(dir);
    await store.load();
    const o = await store.create(input);
    await store.remove(o.id);
    expect(store.list()).toHaveLength(0);
    expect(await readdir(join(dir, 'files'))).toEqual([]);
    const index = JSON.parse(await readFile(join(dir, 'overrides.json'), 'utf8'));
    expect(index.overrides).toEqual([]);
  });

  it('rejects invalid matchers', async () => {
    const store = new OverrideStore(dir);
    await store.load();
    await expect(store.create({ ...input, match: { type: 'regex', pattern: '(', ignoreQuery: false } })).rejects.toThrow(
      /Invalid regular expression/,
    );
  });

  it('keeps concurrent writes consistent', async () => {
    const store = new OverrideStore(dir);
    await store.load();
    const created = await Promise.all([1, 2, 3, 4, 5].map((n) => store.create({ ...input, content: `v${n}` })));
    await Promise.all(created.map((o) => store.update(o.id, { content: `${o.content}!` })));
    const reloaded = new OverrideStore(dir);
    await reloaded.load();
    expect(reloaded.list().map((o) => o.content).sort()).toEqual(['v1!', 'v2!', 'v3!', 'v4!', 'v5!']);
  });

  it('metas() omits content', async () => {
    const store = new OverrideStore(dir);
    await store.load();
    await store.create(input);
    expect(Object.keys(store.metas()[0])).not.toContain('content');
  });
});

describe('OverrideStore workspaces', () => {
  const input = (sourceUrl: string) => ({ kind: 'Script' as const, sourceUrl, content: 'patched();', originalHash: null });

  it("lists and serves only the active workspace's overrides, and creates in the one active when asked", async () => {
    const store = new OverrideStore(dir);
    await store.load();
    store.setWorkspace('aaaaaaaa');
    const a = await store.create(input('https://a.com/a.js'));
    // Asked for while A was active: lands in A even though B is active by the time it is written.
    const late = store.create(input('https://a.com/late.js'));
    store.setWorkspace('bbbbbbbb');
    const b = await store.create(input('https://a.com/b.js'));
    const lateMeta = await late;
    expect(store.list().map((o) => o.id)).toEqual([b.id]);
    expect(store.metas()).toEqual([store.meta(b.id)]);
    expect(store.metas()[0]).not.toHaveProperty('workspaceId');
    // Any override can still be read and updated (a save that began in another workspace).
    await store.update(a.id, { content: 'v2();' });
    expect(store.get(a.id).content).toBe('v2();');
    store.setWorkspace('aaaaaaaa');
    expect(store.list().map((o) => o.id).sort()).toEqual([a.id, lateMeta.id].sort());

    const again = new OverrideStore(dir);
    await again.load();
    again.setWorkspace('bbbbbbbb');
    expect(again.list().map((o) => o.id)).toEqual([b.id]);
  });

  it('gives overrides of no known workspace (saved before workspaces) to the fallback, once', async () => {
    const store = new OverrideStore(dir);
    await store.load();
    const old = await store.create(input('https://a.com/old.js'));
    const index = JSON.parse(await readFile(join(dir, 'overrides.json'), 'utf8'));
    delete index.overrides[0].workspaceId;
    await writeFile(join(dir, 'overrides.json'), JSON.stringify(index));

    const loaded = new OverrideStore(dir);
    await loaded.load();
    await loaded.adopt(new Set(['aaaaaaaa']), 'aaaaaaaa');
    loaded.setWorkspace('aaaaaaaa');
    expect(loaded.list().map((o) => o.id)).toEqual([old.id]);
    expect(JSON.parse(await readFile(join(dir, 'overrides.json'), 'utf8')).overrides[0].workspaceId).toBe('aaaaaaaa');
  });

  it("deletes a workspace's overrides with their files, and no one else's", async () => {
    const store = new OverrideStore(dir);
    await store.load();
    store.setWorkspace('aaaaaaaa');
    const kept = await store.create(input('https://a.com/kept.js'));
    store.setWorkspace('bbbbbbbb');
    await store.create({ ...input('https://a.com/gone.js'), base: 'original();' });
    await store.removeWorkspace('bbbbbbbb');
    expect(store.list()).toEqual([]);
    expect(await readdir(join(dir, 'files'))).toEqual([`${kept.id}.js`]);
    store.setWorkspace('aaaaaaaa');
    expect(store.list().map((o) => o.id)).toEqual([kept.id]);
  });
});

describe('SettingsStore', () => {
  it('uses defaults, persists updates and ignores unknown keys', async () => {
    const path = join(dir, 'settings.json');
    const a = new SettingsStore(path);
    await a.load();
    expect(a.get()).toEqual(DEFAULT_SETTINGS);
    await a.update({ bypassCSP: true, bogus: 1 } as never);

    const b = new SettingsStore(path);
    await b.load();
    expect(b.get()).toEqual({ ...DEFAULT_SETTINGS, bypassCSP: true });
  });

  it('keeps a network speed it knows, and drops one it does not or a switch that is not on or off', async () => {
    const path = join(dir, 'settings.json');
    const a = new SettingsStore(path);
    await a.load();
    await a.update({ throttling: 'slow-4g', captureConsole: 'yes' as never });
    await a.update({ throttling: 'dial-up' as never });
    const b = new SettingsStore(path);
    await b.load();
    expect(b.get()).toEqual({ ...DEFAULT_SETTINGS, throttling: 'slow-4g' });
  });

  it('applies overlapping updates one after the other', async () => {
    const path = join(dir, 'settings.json');
    const s = new SettingsStore(path);
    await s.load();
    await Promise.all([s.update({ bypassCSP: true }), s.update({ autoReloadOnSave: false }), s.update({ stripIntegrity: false })]);
    const expected = { ...DEFAULT_SETTINGS, bypassCSP: true, autoReloadOnSave: false, stripIntegrity: false };
    expect(s.get()).toEqual(expected);
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual(expected);
  });

  it('survives a corrupt file', async () => {
    const path = join(dir, 'settings.json');
    await writeFile(path, '{nope', 'utf8');
    const s = new SettingsStore(path);
    await s.load();
    expect(s.get()).toEqual(DEFAULT_SETTINGS);
  });
});
