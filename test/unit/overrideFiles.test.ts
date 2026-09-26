/**
 * Edits made to override files in another editor: the store takes a file as it is on disk only when
 * it differs from what the app wrote, and the watcher hands over the changed overrides in one batch.
 */
import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OverrideFileWatcher, vscodeUrl } from '../../src/main/overrideFiles';
import { EDIT_SETTLE_MS } from '../../src/main/overrideFiles/constants';
import { contentFileId, OverrideStore } from '../../src/main/store/OverrideStore';

let dir: string;
let store: OverrideStore;
let watcher: OverrideFileWatcher | undefined;

const input = { kind: 'Script' as const, sourceUrl: 'https://a.com/app.js', content: 'mine();', originalHash: null };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'console-editor-files-'));
  store = new OverrideStore(dir);
  await store.load();
});

afterEach(async () => {
  watcher?.stop();
  watcher = undefined;
  await rm(dir, { recursive: true, force: true });
});

describe('contentFileId', () => {
  it("names the override of a content file, and nothing for its base, a temp file or another file", () => {
    expect(contentFileId('0a1b2c3d.js')).toBe('0a1b2c3d');
    expect(contentFileId('0a1b2c3d.json')).toBe('0a1b2c3d');
    expect(contentFileId('0a1b2c3d.base.js')).toBeNull();
    expect(contentFileId('0a1b2c3d.js.9f8e7d6c.tmp')).toBeNull();
    expect(contentFileId('0a1b2c3d.js~')).toBeNull();
    expect(contentFileId('.0a1b2c3d.js.swp')).toBeNull();
    expect(contentFileId('0a1b2c3d.ts')).toBeNull();
  });
});

describe('OverrideStore.takeFileEdit', () => {
  it("serves a file another editor saved, and keeps it after a restart", async () => {
    const o = await store.create(input);
    await writeFile(store.contentPath(o.id), 'theirs();');
    expect(await store.takeFileEdit(o.id)).toBe(true);
    expect(store.get(o.id).content).toBe('theirs();');
    expect(store.list()[0].content).toBe('theirs();');
    expect(store.meta(o.id).updatedAt).toBeGreaterThanOrEqual(o.updatedAt);
    // Taken once.
    expect(await store.takeFileEdit(o.id)).toBe(false);

    const again = new OverrideStore(dir);
    await again.load();
    expect(again.get(o.id).content).toBe('theirs();');
  });

  it("finds the app's own writes unchanged, even while they are still being written", async () => {
    const o = await store.create(input);
    const writing = store.update(o.id, { content: 'saved in the app();' });
    // Queued behind the save: reads the file once the save is done.
    expect(await store.takeFileEdit(o.id)).toBe(false);
    await writing;
    expect(store.get(o.id).content).toBe('saved in the app();');
    const index = await readFile(join(dir, 'overrides.json'), 'utf8');
    expect(await store.takeFileEdit(o.id)).toBe(false);
    // Nothing is written for an unchanged file.
    expect(await readFile(join(dir, 'overrides.json'), 'utf8')).toBe(index);
  });

  it('keeps serving what it has while the file is gone, and takes it once it is back', async () => {
    const o = await store.create(input);
    const path = store.contentPath(o.id);
    await rename(path, `${path}~`);
    expect(await store.takeFileEdit(o.id)).toBe(false);
    expect(store.get(o.id).content).toBe('mine();');
    await writeFile(path, 'back();');
    expect(await store.takeFileEdit(o.id)).toBe(true);
    expect(store.get(o.id).content).toBe('back();');
  });

  it('ignores a deleted override', async () => {
    const o = await store.create(input);
    await store.remove(o.id);
    expect(await store.takeFileEdit(o.id)).toBe(false);
  });

  it("reaches an override of another workspace, which isn't served until it is active", async () => {
    store.setWorkspace('ws1');
    const o = await store.create(input);
    store.setWorkspace('ws2');
    await writeFile(store.contentPath(o.id), 'theirs();');
    expect(await store.takeFileEdit(o.id)).toBe(true);
    expect(store.list()).toEqual([]);
    store.setWorkspace('ws1');
    expect(store.list()[0].content).toBe('theirs();');
  });
});

describe('OverrideFileWatcher', () => {
  function watch() {
    const onEdited = vi.fn<(ids: string[]) => void>();
    watcher = new OverrideFileWatcher({
      dir: store.filesDir,
      idOf: contentFileId,
      ids: () => store.list().map((o) => o.id),
      take: (id) => store.takeFileEdit(id),
      onEdited,
    });
    watcher.start();
    return onEdited;
  }

  it('hands over the overrides another editor changed, in one batch once the folder is quiet', async () => {
    const a = await store.create(input);
    const b = await store.create({ ...input, sourceUrl: 'https://a.com/b.js' });
    const onEdited = watch();
    await writeFile(store.contentPath(a.id), 'a2();');
    await writeFile(store.contentPath(b.id), 'b2();');
    await vi.waitFor(() => expect(onEdited).toHaveBeenCalled(), { timeout: 5000 });
    expect(onEdited).toHaveBeenCalledTimes(1);
    expect(onEdited.mock.calls[0][0].sort()).toEqual([a.id, b.id].sort());
    expect(store.get(a.id).content).toBe('a2();');
  });

  it('takes a save that writes elsewhere and renames over the file, as vim does', async () => {
    const o = await store.create(input);
    const onEdited = watch();
    const path = store.contentPath(o.id);
    await writeFile(`${path}.swp`, 'vim();');
    await rename(`${path}.swp`, path);
    await vi.waitFor(() => expect(onEdited).toHaveBeenCalledWith([o.id]), { timeout: 5000 });
    expect(store.get(o.id).content).toBe('vim();');
  });

  it("doesn't report the app's own saves, new overrides or deletions", async () => {
    const onEdited = watch();
    const o = await store.create(input);
    await store.update(o.id, { content: 'saved();' });
    const gone = await store.create({ ...input, sourceUrl: 'https://a.com/gone.js' });
    await store.remove(gone.id);
    await sleep(EDIT_SETTLE_MS * 4);
    expect(onEdited).not.toHaveBeenCalled();
  });

  it('stops reporting once stopped', async () => {
    const o = await store.create(input);
    const onEdited = watch();
    watcher!.stop();
    await writeFile(store.contentPath(o.id), 'later();');
    await sleep(EDIT_SETTLE_MS * 4);
    expect(onEdited).not.toHaveBeenCalled();
  });
});

describe('vscodeUrl', () => {
  // A POSIX path: Windows would put it on the current drive.
  it.skipIf(process.platform === 'win32')("opens a file by its encoded absolute path under VS Code's scheme", () => {
    expect(vscodeUrl('/Users/me/Library/Application Support/Console Editor/workspace/files/0a1b2c3d.js')).toBe(
      'vscode://file/Users/me/Library/Application%20Support/Console%20Editor/workspace/files/0a1b2c3d.js',
    );
  });
});
