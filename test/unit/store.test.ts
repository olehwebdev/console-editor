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
    expect(loaded.base).toBe('original();');
    expect(loaded.enabled).toBe(false);
    expect(loaded.match.type).toBe('glob');
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

  it('survives a corrupt file', async () => {
    const path = join(dir, 'settings.json');
    await writeFile(path, '{nope', 'utf8');
    const s = new SettingsStore(path);
    await s.load();
    expect(s.get()).toEqual(DEFAULT_SETTINGS);
  });
});
