/**
 * Captures and designs: keeping them with their workspace (names, limits, renames, scale, deleting a workspace's,
 * a malformed file), what a capture is named and which part of the page it clips to, and a PNG's size.
 */
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { ShotStore, type NewShot } from '../../src/main/store/ShotStore';
import { captureName } from '../../src/main/shots/captureName';
import { clipOf } from '../../src/main/shots/capture/clipOf';
import { readPngSize } from '../../src/main/shots/readPngSize';

const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'console-editor-shots-')));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

/** A PNG header claiming `width` × `height` (enough for its size to be read). */
function pngHeader(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(33);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  bytes.writeUInt32BE(13, 8);
  bytes.write('IHDR', 12);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

const capture = (name: string, extra: Partial<NewShot> = {}): NewShot => ({
  kind: 'capture',
  name,
  width: 2880,
  height: 1800,
  scale: 2,
  pageUrl: 'https://shop.test/cart',
  browser: { id: 'app', name: 'Chromium', version: '152.0.1' },
  viewport: { width: 1440, height: 900 },
  area: 'viewport',
  group: null,
  bytes: pngHeader(2880, 1800),
  ext: 'png',
  thumb: Buffer.from('thumb'),
  ...extra,
});

async function openStore(dir = mkdtempSync(join(tmp, 'store-'))): Promise<ShotStore> {
  const store = new ShotStore(dir);
  await store.load();
  store.setWorkspace('ws1');
  return store;
}

describe('ShotStore', () => {
  it('keeps a shot with its image and thumbnail, lists the active workspace’s newest first, and keeps them across a restart', async () => {
    const dir = mkdtempSync(join(tmp, 'store-'));
    const store = await openStore(dir);
    const first = await store.add(capture('shop.test-cart-1440.png'));
    await new Promise((r) => setTimeout(r, 5));
    const second = await store.add(capture('shop.test-cart-1440.png', { area: 'page' }));
    // A name already in the workspace gets a number.
    expect(second.name).toBe('shop.test-cart-1440-2.png');
    expect(first).toEqual({ id: expect.stringMatching(/^[0-9a-f]{8}$/), kind: 'capture', name: 'shop.test-cart-1440.png', width: 2880, height: 1800, scale: 2, pageUrl: 'https://shop.test/cart', browser: { id: 'app', name: 'Chromium', version: '152.0.1' }, viewport: { width: 1440, height: 900 }, area: 'viewport', group: null, createdAt: expect.any(Number), updatedAt: expect.any(Number) });
    expect(store.list().map((s) => s.id)).toEqual([second.id, first.id]);
    expect(readFileSync(store.paths(first.id).thumb, 'utf8')).toBe('thumb');
    expect((await store.read(first.id)).equals(pngHeader(2880, 1800))).toBe(true);

    store.setWorkspace('ws2');
    expect(store.list()).toEqual([]);
    // Any workspace's shot is still reached by id.
    expect(store.get(first.id).name).toBe('shop.test-cart-1440.png');
    await store.add(capture('shop.test-cart-1440.png'));
    expect(store.list()[0].name).toBe('shop.test-cart-1440.png');

    const again = new ShotStore(dir);
    await again.load();
    again.setWorkspace('ws1');
    expect(again.list().map((s) => s.name)).toEqual(['shop.test-cart-1440-2.png', 'shop.test-cart-1440.png']);
  });

  it('renames, refusing an empty name, one another has, and cleaning what file systems refuse', async () => {
    const store = await openStore();
    const a = await store.add(capture('a.png'));
    const b = await store.add(capture('b.png'));
    expect((await store.rename(a.id, '  home: hero/v2?.png ')).name).toBe('home- hero-v2-.png');
    await expect(store.rename(a.id, '   ')).rejects.toThrow('Give it a name');
    await expect(store.rename(a.id, 'b.png')).rejects.toThrow('Another has the name b.png');
    await expect(store.rename('00000000', 'c.png')).rejects.toThrow('no longer exists');
    expect(store.get(b.id).name).toBe('b.png');
    expect((await store.setScale(a.id, 3)).scale).toBe(3);
    await expect(store.setScale(a.id, 0)).rejects.toThrow('Invalid scale');
  });

  it('deletes a shot with its files, and a workspace’s shots with theirs', async () => {
    const store = await openStore();
    const a = await store.add(capture('a.png'));
    const { image, thumb } = store.paths(a.id);
    await store.remove(a.id);
    expect(existsSync(image) || existsSync(thumb)).toBe(false);
    expect(store.list()).toEqual([]);

    const b = await store.add(capture('b.png'));
    store.setWorkspace('other');
    const c = await store.add(capture('c.png'));
    const bFiles = store.paths(b.id);
    await store.removeWorkspace('ws1');
    expect(existsSync(bFiles.image)).toBe(false);
    expect(store.get(c.id).name).toBe('c.png');
    expect(() => store.get(b.id)).toThrow('no longer exists');
  });

  it('refuses a file too large, and more shots than a workspace keeps', async () => {
    const store = await openStore();
    await expect(store.add(capture('big.png', { bytes: Buffer.alloc(50 * 1024 * 1024 + 1) }))).rejects.toThrow('at most 50 MB');
    await Promise.all(Array.from({ length: 500 }, (_, i) => store.add(capture(`${i}.png`, { thumb: null }))));
    await expect(store.add(capture('501.png'))).rejects.toThrow('at most 500');
  });

  it('reads a malformed file or record as none, and a newer file as empty', async () => {
    const dir = mkdtempSync(join(tmp, 'store-'));
    const good = { id: '0a1b2c3d', workspaceId: 'ws1', kind: 'design', name: 'hero.png', width: 2880, height: 4000, scale: 2, ext: 'png', createdAt: 1, updatedAt: 1, pageUrl: null, browser: null, viewport: null, area: null, group: null };
    writeFileSync(join(dir, 'shots.json'), JSON.stringify({ version: 1, shots: [good, { ...good, id: 'bad' }, { ...good, id: '11111111', width: -1 }, { ...good, id: '22222222', kind: 'photo' }, good] }));
    const store = await openStore(dir);
    expect(store.list()).toEqual([{ id: '0a1b2c3d', kind: 'design', name: 'hero.png', width: 2880, height: 4000, scale: 2, createdAt: 1, updatedAt: 1, pageUrl: null, browser: null, viewport: null, area: null, group: null }]);
    writeFileSync(join(dir, 'shots.json'), JSON.stringify({ version: 2, shots: [good] }));
    await store.load();
    expect(store.list()).toEqual([]);
  });
});

describe('Capturing', () => {
  it('names a capture after its page, width and what it covers', () => {
    expect(captureName('https://shop.test/cart/items?x=1', 1440, 'page')).toBe('shop.test-cart-items-1440-full.png');
    expect(captureName('http://127.0.0.1:5173/', 390.4, 'viewport')).toBe('127.0.0.1-5173-390.png');
    expect(captureName('about:blank', 800, 'element')).toBe('page-800-element.png');
    expect(captureName('not a url', 800, 'viewport')).toBe('page-800.png');
  });

  it('clips to the whole page (down to the texture limit) or to an element moved by the scroll, inside the page', () => {
    const metrics = { cssLayoutViewport: { pageX: 0, pageY: 500, clientWidth: 1440, clientHeight: 900 }, cssContentSize: { width: 1440, height: 20_000 } };
    expect(clipOf({ area: 'viewport' }, metrics, 8192)).toBeNull();
    expect(clipOf({ area: 'page' }, metrics, 8192)).toEqual({ x: 0, y: 0, width: 1440, height: 8192 });
    expect(clipOf({ area: 'element', box: { x: 100, y: 50, width: 200, height: 80 } }, metrics, 8192)).toEqual({ x: 100, y: 550, width: 200, height: 80 });
    // Partly off the page's left edge: what is on the page.
    expect(clipOf({ area: 'element', box: { x: -40, y: 0, width: 100, height: 10 } }, metrics, 8192)).toEqual({ x: 0, y: 500, width: 60, height: 10 });
    expect(() => clipOf({ area: 'element', box: { x: 10, y: 10, width: 0, height: 10 } }, metrics, 8192)).toThrow('no size');
  });

  it("reads a PNG's size from its header", () => {
    expect(readPngSize(pngHeader(1024, 7))).toEqual({ width: 1024, height: 7 });
    expect(() => readPngSize(Buffer.alloc(3))).toThrow('empty');
  });
});

describe('Designs', () => {
  it("reads a PNG's, JPEG's and WebP's type and size from their bytes, and nothing else's", async () => {
    const { imageInfo } = await import('../../src/main/shots/imageInfo');
    expect(imageInfo(pngHeader(2880, 5000))).toEqual({ ext: 'png', width: 2880, height: 5000 });
    // A JPEG: SOI, an APP0 segment, then a baseline frame header (height 1080, width 1920).
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x04, 0x38, 0x07, 0x80, 0x03, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(imageInfo(jpeg)).toEqual({ ext: 'jpg', width: 1920, height: 1080 });
    const riff = (chunk: string, data: number[]) => Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.from(chunk, 'latin1'), Buffer.alloc(4), Buffer.from(data), Buffer.alloc(10)]);
    // Lossy: a frame tag (3 bytes), a start code (3), then 14-bit width and height, little-endian.
    expect(imageInfo(riff('VP8 ', [0, 0, 0, 0x9d, 0x01, 0x2a, 0x80, 0x02, 0xe0, 0x01]))).toEqual({ ext: 'webp', width: 640, height: 480 });
    // Lossless: a signature byte, then width − 1 and height − 1 in 14 bits each.
    const bits = (640 - 1) | ((480 - 1) << 14);
    expect(imageInfo(riff('VP8L', [0x2f, bits & 0xff, (bits >> 8) & 0xff, (bits >> 16) & 0xff, (bits >> 24) & 0xff]))).toEqual({ ext: 'webp', width: 640, height: 480 });
    // Extended: flags (4 bytes), then 24-bit width − 1 and height − 1.
    expect(imageInfo(riff('VP8X', [0, 0, 0, 0, 0x7f, 0x02, 0x00, 0xdf, 0x01, 0x00]))).toEqual({ ext: 'webp', width: 640, height: 480 });
    expect(imageInfo(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(imageInfo(Buffer.from([0x89, 0x50, 0x4e]))).toBeNull();
  });

  it("takes a design's scale from its name, else its width", async () => {
    const { designScale } = await import('../../src/main/shots/designScale');
    expect(designScale('hero@2x.png', 800)).toBe(2);
    expect(designScale('Hero @3X.jpg', 800)).toBe(3);
    expect(designScale('hero.png', 2880)).toBe(2);
    expect(designScale('hero.png', 1440)).toBe(1);
  });
});
