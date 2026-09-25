import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mapFromFile } from '../../src/main/sourceMap';
import { SourceMapFileStore } from '../../src/main/store/SourceMapFileStore';

const BUNDLE = 'https://site.test/assets/app.js';
const bytes = (text: string) => new TextEncoder().encode(text);

describe('source maps loaded from files (SourceMapFileStore)', () => {
  let dir: string;
  let store: SourceMapFileStore;
  const copies = async () => (await readdir(join(dir, 'source-maps'))).filter((name) => name.endsWith('.map'));

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'console-editor-maps-'));
    store = new SourceMapFileStore(dir);
    await store.load();
    store.setWorkspace('w1');
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("keeps a copy of the file for the active workspace's bundle, and reads it back after a restart", async () => {
    const added = await store.add(BUNDLE, '/home/me/builds/app.js.map', bytes('{"version":3}'));
    expect(added).toEqual({ bundleUrl: BUNDLE, name: 'app.js.map', size: 13, addedAt: expect.any(Number) });
    const restarted = new SourceMapFileStore(dir);
    await restarted.load();
    restarted.setWorkspace('w1');
    expect(restarted.list()).toEqual([added]);
    const read = await restarted.read(BUNDLE);
    expect(read?.name).toBe('app.js.map');
    expect(new TextDecoder().decode(read!.bytes)).toBe('{"version":3}');
  });

  it("keeps each workspace's maps apart, replaces a bundle's map, and deletes the copies it no longer names", async () => {
    await store.add(BUNDLE, 'old.map', bytes('old'));
    await store.add(BUNDLE, 'new.map', bytes('new'));
    expect(store.list().map((m) => m.name)).toEqual(['new.map']);
    expect(await copies()).toHaveLength(1);

    store.setWorkspace('w2');
    expect(store.list()).toEqual([]);
    expect(await store.read(BUNDLE)).toBeNull();
    await store.add(BUNDLE, 'w2.map', bytes('w2'));

    store.setWorkspace('w1');
    await store.forget(BUNDLE);
    expect(store.list()).toEqual([]);
    await store.removeWorkspace('w2');
    expect(await copies()).toEqual([]);
  });

  it('leaves out index entries that do not hold up, such as a copy named outside its folder', async () => {
    await store.add(BUNDLE, 'app.js.map', bytes('{}'));
    const index = join(dir, 'source-maps', 'index.json');
    const entries = JSON.parse(await readFile(index, 'utf8'));
    await writeFile(index, JSON.stringify([...entries, { ...entries[0], bundleUrl: 'https://site.test/b.js', file: '../../secret.map' }, { workspaceId: 'w1' }, 'junk']));
    const reloaded = new SourceMapFileStore(dir);
    await reloaded.load();
    reloaded.setWorkspace('w1');
    expect(reloaded.list().map((m) => m.bundleUrl)).toEqual([BUNDLE]);
  });

  it("hands a file's map over as found, against the bundle as the server sent it", async () => {
    const content = async () => ({ url: BUNDLE, content: 'var a;', hash: 'h1' });
    expect(await mapFromFile(BUNDLE, { name: 'app.js.map', bytes: bytes('{}') }, content)).toEqual({
      status: 'found',
      bundleHash: 'h1',
      bundle: 'var a;',
      mapUrl: null,
      map: { type: 'bytes', bytes: bytes('{}') },
      file: 'app.js.map',
    });
    expect(await mapFromFile(BUNDLE, { name: 'x.map', bytes: bytes('{}') }, async () => Promise.reject(new Error('not listed')))).toMatchObject({ status: 'failed', failure: 'unreadable', detail: 'not listed' });
  });
});
