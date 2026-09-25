import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { placePageWindow } from '../../src/main/PageWindow/placePageWindow';
import { PageWindowStore } from '../../src/main/store/PageWindowStore';
import { sanitizePageWindow } from '../../src/main/store/PageWindowStore/sanitizePageWindow';

/** Two side-by-side screens' work areas; the editor on the left one. */
const LEFT = { x: 0, y: 0, width: 1920, height: 1040 };
const RIGHT = { x: 1920, y: 0, width: 2560, height: 1400 };
const EDITOR = { x: 100, y: 100, width: 1400, height: 800 };

describe('placePageWindow', () => {
  it('opens where it was, while enough of that is on a screen', () => {
    const saved = { x: 2000, y: 40, width: 900, height: 700 };
    expect(placePageWindow(saved, [LEFT, RIGHT], EDITOR)).toEqual(saved);
    // Mostly off the right edge, but still 100px on it.
    const edge = { x: 1820, y: 40, width: 900, height: 700 };
    expect(placePageWindow(edge, [LEFT], EDITOR)).toEqual(edge);
  });

  it("goes to another screen than the editor's, centred, when it has no place yet or its screen is gone", () => {
    const onRight = { x: 1920 + 640, y: 250, width: 1280, height: 900 };
    expect(placePageWindow(undefined, [LEFT, RIGHT], EDITOR)).toEqual(onRight);
    // Its screen was unplugged: less than 80px of it is left on one still there.
    expect(placePageWindow({ x: 1860, y: 40, width: 900, height: 700 }, [LEFT], EDITOR)).not.toEqual({ x: 1860, y: 40, width: 900, height: 700 });
    // The editor on the right screen: it goes left.
    expect(placePageWindow(undefined, [LEFT, RIGHT], { ...EDITOR, x: 2200 })).toEqual({ x: 320, y: 70, width: 1280, height: 900 });
  });

  it("fits a single screen: centred on the editor's, at most 90% of it", () => {
    const small = { x: 0, y: 0, width: 1000, height: 700 };
    expect(placePageWindow(undefined, [small], { ...EDITOR, width: 800, height: 600 })).toEqual({ x: 50, y: 35, width: 900, height: 630 });
    expect(placePageWindow(undefined, [LEFT], EDITOR)).toEqual({ x: 320, y: 70, width: 1280, height: 900 });
  });
});

describe('sanitizePageWindow', () => {
  it('keeps a well-formed state', () => {
    const saved = { detached: true, bounds: { x: -1200, y: 10, width: 900, height: 700 }, maximized: true };
    expect(sanitizePageWindow(saved)).toEqual(saved);
  });

  it('drops what is malformed, and whatever it does not know', () => {
    expect(sanitizePageWindow(null)).toEqual({ detached: false });
    expect(sanitizePageWindow('x')).toEqual({ detached: false });
    expect(sanitizePageWindow({ detached: 'yes', maximized: 1, extra: 1 })).toEqual({ detached: false });
    expect(sanitizePageWindow({ detached: true, bounds: { x: 1.5, y: 0, width: 900, height: 700 } })).toEqual({ detached: true });
    expect(sanitizePageWindow({ detached: true, bounds: { x: 0, y: 0, width: 0, height: 700 } })).toEqual({ detached: true });
    expect(sanitizePageWindow({ detached: true, bounds: { x: 0, y: 0, width: 900 } })).toEqual({ detached: true });
  });
});

describe('PageWindowStore', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'console-editor-page-window-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('starts attached, and remembers each change across instances', async () => {
    const path = join(dir, 'nested', 'page-window.json');
    const a = new PageWindowStore(path);
    await a.load();
    expect(a.get()).toEqual({ detached: false });

    const detaching = a.update({ detached: true });
    // In effect at once, before the write.
    expect(a.get().detached).toBe(true);
    await detaching;
    await a.update({ bounds: { x: 1, y: 2, width: 900, height: 700 } });

    const b = new PageWindowStore(path);
    await b.load();
    expect(b.get()).toEqual({ detached: true, bounds: { x: 1, y: 2, width: 900, height: 700 } });
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual(b.get());
  });

  it('opens attached from a corrupt file, and a failed write is not an error', async () => {
    const path = join(dir, 'page-window.json');
    await writeFile(path, '{ not json');
    const store = new PageWindowStore(path);
    await store.load();
    expect(store.get()).toEqual({ detached: false });

    // Its folder is a file: the write fails, the change still holds.
    const blocked = new PageWindowStore(join(path, 'page-window.json'));
    await expect(blocked.update({ detached: true })).resolves.toBeUndefined();
    expect(blocked.get().detached).toBe(true);
  });
});
