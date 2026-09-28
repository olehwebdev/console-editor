/**
 * Captures and designs in the renderer: a shot's line and age, the search, the pages that follow the list (closing
 * a deleted shot's, renaming a renamed one's), and capturing an element picked for it (and not the next ordinary pick).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Shot } from '../../src/shared/types';
import { useTabStore } from '@/entities/editor-tab';
import { matchesShot, shotDetail, useShotStore } from '@/entities/shot';
import { timeAgo } from '@/entities/shot/lib/timeAgo';
import { captureShot, pickingStarted, pickToCapture, takePickCapture } from '@/features/shot/capture';
import { openShot, receiveShots } from '@/features/shot/open-shot';

const api = vi.hoisted(() => ({ captureShot: vi.fn(), captureElementShot: vi.fn(), startPicking: vi.fn(async () => {}) }));
const toast = vi.hoisted(() => Object.assign(vi.fn(() => 'toast-1'), { dismiss: vi.fn(), update: vi.fn() }));

vi.mock('@/shared/api', () => ({ api, onAppEvent: () => () => {}, errorMessage: (err: unknown) => (err as Error).message }));
vi.mock('@/shared/ui/toast', () => ({ toast }));
vi.mock('@/shared/monaco', () => ({
  monaco: { editor: { createModel: () => ({}) }, Uri: { from: () => ({}) } },
  languageFor: () => 'javascript',
  setModelSchema: () => {},
  editorHasFocus: () => false,
  dismissEditorWidgets: () => {},
  triggerInActiveEditor: () => {},
}));

const HOUR = 60 * 60 * 1000;

const shot = (id: string, extra: Partial<Shot> = {}): Shot => ({
  id,
  kind: 'capture',
  name: `${id}.png`,
  width: 2880,
  height: 1800,
  scale: 2,
  pageUrl: 'https://shop.test/cart',
  browser: { id: 'app', name: 'Chromium', version: '152.0.7390.54' },
  viewport: { width: 1440, height: 900 },
  area: 'viewport',
  group: null,
  createdAt: 0,
  updatedAt: 0,
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  useTabStore.setState({ tabs: [], sources: [], pages: [], activeId: null });
  useShotStore.getState().setAll([]);
});

describe('A shot’s line', () => {
  it('says how long ago, in its largest whole unit', () => {
    expect(timeAgo(0, 30_000)).toBe('just now');
    expect(timeAgo(0, 60_000)).toBe('1 min ago');
    expect(timeAgo(0, 15 * HOUR + 59 * 60_000)).toBe('15 h ago');
    expect(timeAgo(0, 24 * HOUR)).toBe('1 day ago');
    expect(timeAgo(0, 50 * HOUR)).toBe('2 days ago');
    expect(timeAgo(10, 0)).toBe('just now');
  });

  it("names a capture's kind, browser, viewport and age, and a design's width", () => {
    expect(shotDetail(shot('a'), 15 * HOUR)).toBe('Capture · Chromium 152 · 1440 × 900 · 15 h ago');
    expect(shotDetail(shot('b', { kind: 'design', browser: null, viewport: null, width: 2880, scale: 2 }), 0)).toBe('Design · 1440 wide · just now');
  });

  it('matches every word of a search in its name, address or browser', () => {
    expect(matchesShot(shot('hero'), 'hero shop.test')).toBe(true);
    expect(matchesShot(shot('hero'), 'chromium')).toBe(true);
    expect(matchesShot(shot('hero'), 'hero firefox')).toBe(false);
    expect(matchesShot(shot('hero'), '')).toBe(true);
  });
});

describe('Shot pages', () => {
  it('close with their shot, and take its new name', () => {
    openShot(shot('a'));
    openShot(shot('b'));
    expect(useTabStore.getState().pages.map((p) => p.title)).toEqual(['a.png', 'b.png']);
    receiveShots([shot('b', { name: 'hero.png' })]);
    expect(useTabStore.getState().pages.map((p) => [p.id, p.title])).toEqual([['shot:b', 'hero.png']]);
    expect(useShotStore.getState().shots.map((s) => s.name)).toEqual(['hero.png']);
  });
});

describe('Capturing', () => {
  it('captures the page and offers to open the capture; says why when it fails', async () => {
    api.captureShot.mockResolvedValue(shot('a'));
    const onOpen = vi.fn();
    expect(await captureShot('page', null, onOpen)).toEqual(shot('a'));
    expect(api.captureShot).toHaveBeenCalledWith('page');
    const { action } = (toast.mock.calls.at(-1) as unknown as [{ title: string; action: { onClick(): void } }])[0];
    action.onClick();
    expect(onOpen).toHaveBeenCalledWith(shot('a'));

    api.captureShot.mockRejectedValue(new Error('Show the website to capture it'));
    expect(await captureShot('viewport', null)).toBeNull();
    expect(toast).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Could not capture the page', description: 'Show the website to capture it', tone: 'danger' }));
  });

  it('captures the element picked for it, once, and not one picked after picking started again', async () => {
    api.captureElementShot.mockResolvedValue(shot('el', { area: 'element' }));
    await pickToCapture();
    expect(api.startPicking).toHaveBeenCalledTimes(1);
    pickingStarted();
    takePickCapture('pick-1', openShot);
    await vi.waitFor(() => expect(api.captureElementShot).toHaveBeenCalledWith('pick-1'));
    takePickCapture('pick-2', openShot);
    expect(api.captureElementShot).toHaveBeenCalledTimes(1);

    // Esc, then picking again for the inspector: that pick is an ordinary one.
    await pickToCapture();
    pickingStarted();
    pickingStarted();
    takePickCapture('pick-3', openShot);
    expect(api.captureElementShot).toHaveBeenCalledTimes(1);
  });
});

describe('Comparing', () => {
  /** An image of one colour, with a box of another. */
  const image = (width: number, height: number, fill: number[], box?: { x: number; y: number; size: number; color: number[] }) => {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const inBox = box && x >= box.x && y >= box.y && x < box.x + box.size && y < box.y + box.size;
        data.set(inBox ? box.color : fill, (y * width + x) * 4);
      }
    }
    return { data, width, height };
  };
  const WHITE = [255, 255, 255, 255];
  const RED = [255, 0, 0, 255];

  it('finds nothing between the same images, and ignores colours closer than the threshold', async () => {
    const { diffPixels } = await import('@/features/shot/compare/lib/diffPixels');
    const a = image(40, 30, WHITE);
    expect(diffPixels(a, image(40, 30, WHITE), { x: 0, y: 0 }, 0.1)).toMatchObject({ differing: 0, total: 1200, regions: [] });
    expect(diffPixels(a, image(40, 30, [250, 250, 250, 255]), { x: 0, y: 0 }, 0.1).differing).toBe(0);
  });

  it('counts the pixels that differ, marks them, and boxes each area', async () => {
    const { diffPixels } = await import('@/features/shot/compare/lib/diffPixels');
    const a = image(100, 100, WHITE);
    const b = image(100, 100, WHITE, { x: 60, y: 70, size: 10, color: RED });
    const result = diffPixels(a, b, { x: 0, y: 0 }, 0.1);
    expect(result.differing).toBe(100);
    expect(result.regions).toEqual([{ x: 48, y: 64, width: 32, height: 16 }]);
    expect([...result.image.data.slice((75 * 100 + 65) * 4, (75 * 100 + 65) * 4 + 4)]).toEqual([255, 0, 64, 255]);
    // A pixel the same in both is a faded grey.
    expect(result.image.data[0]).toBeGreaterThan(240);
  });

  it('moves the second image by the offset, and counts what only one covers as differing', async () => {
    const { diffPixels } = await import('@/features/shot/compare/lib/diffPixels');
    const a = image(50, 50, WHITE, { x: 10, y: 10, size: 5, color: RED });
    const b = image(50, 50, WHITE, { x: 7, y: 6, size: 5, color: RED });
    // The boxes line up once moved; only the pixels outside the 47 × 46 both cover differ.
    expect(diffPixels(a, b, { x: 3, y: 4 }, 0.1)).toMatchObject({ differing: 53 * 54 - 47 * 46, total: 53 * 54 });
    const taller = diffPixels(image(10, 10, WHITE), image(10, 15, WHITE), { x: 0, y: 0 }, 0.1);
    expect(taller).toMatchObject({ differing: 50, total: 150, regions: [{ x: 0, y: 0, width: 10, height: 15 }] });
  });

  it('says how much differs as a share a person reads', async () => {
    const { differingShare } = await import('@/widgets/editor-panel/ui/ComparePage/differingShare');
    expect(differingShare(0, 100)).toBe('0%');
    expect(differingShare(1, 1_000_000)).toBe('< 0.01%');
    expect(differingShare(402_500, 960_000)).toBe('41.9%');
    expect(differingShare(5, 1000)).toBe('0.50%');
  });
});
