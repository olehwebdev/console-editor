import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_CONSOLE_ENTRIES } from '../../src/shared/constants';
import { WORKSPACE_COLORS, type ConsoleEntry, type ConsoleFrame, type Workspace } from '../../src/shared/types';
import { useConsoleStore } from '@/entities/console-log';
import { TOP_FRAME_KEY, frameKey, frameLabel, frameLabels, frameTone, givenName, useFrameStore } from '@/entities/frame';
import { useWorkspaceStore } from '@/entities/workspace';
import { DEFAULT_LEVELS, matchesFilter, receiveEntries, useConsoleFilter } from '@/features/filter-console';
import { nameFrame } from '@/features/name-frame';
import { runInFrame } from '@/features/run-in-frame';
import { historyOf } from '@/features/run-in-frame/model/historyOf';
import { promptHistory } from '@/features/run-in-frame/model/promptHistory';
import { levelSummary } from '@/widgets/console-panel/ui/ConsolePanel/levelSummary';
import { problemCounts } from '@/widgets/console-panel/ui/ConsolePanel/problemCounts';
import { resolveTarget } from '@/widgets/console-panel/ui/ConsolePanel/resolveTarget';
import { rowLine } from '@/widgets/console-panel/ui/ConsolePanel/rowLine';
import { sinceInput } from '@/widgets/console-panel/ui/ConsolePanel/sinceInput';

const api = vi.hoisted(() => ({ evaluateInFrame: vi.fn(), updateWorkspace: vi.fn(), getWorkspaces: vi.fn() }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { dismiss: vi.fn(), update: vi.fn() }));
vi.mock('@/shared/api', () => ({ api, onAppEvent: () => () => {}, errorMessage: (err: unknown) => (err as Error).message }));
vi.mock('@/shared/ui/toast', () => ({ toast }));

const TOP: ConsoleFrame = { id: 'T', url: 'https://shop.test/checkout?step=2', name: '', canRun: true };
const frame = (id: string, url: string, name = ''): ConsoleFrame => ({ id, parentId: 'T', url, name, canRun: true });
let nextId = 1;
const entry = (partial: Partial<ConsoleEntry> = {}): ConsoleEntry => ({
  id: nextId++,
  frameId: 'T',
  level: 'info',
  source: 'console',
  time: 1000,
  values: [{ kind: 'string', text: 'hello' }],
  ...partial,
});
const workspace = (frameNames: Record<string, string> = {}): Workspace => ({ id: 'w1', name: '', host: '', title: '', icon: 'favicon', color: 'ember', frameNames });

beforeEach(() => {
  vi.clearAllMocks();
  useConsoleStore.setState({ entries: [] });
  useFrameStore.setState({ frames: [], seen: {} });
  useConsoleFilter.setState({ frameKeys: [], levels: DEFAULT_LEVELS, text: '', preserveLog: false });
  useWorkspaceStore.setState({ workspaces: [workspace()], activeId: 'w1' });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('frames', () => {
  it('keys a frame by what survives a reload: the top page is always the top, an iframe its address or name', () => {
    expect(frameKey(TOP)).toBe(TOP_FRAME_KEY);
    expect(frameKey(frame('A', 'https://cart.test/embed?session=9#x'))).toBe('https://cart.test/embed');
    expect(frameKey(frame('B', 'about:blank', 'ads'))).toBe('name:ads');
    expect(frameKey(frame('C', ''))).toBe('id:C');
    // An iframe named "top" is not the top page.
    expect(frameKey(frame('D', 'about:blank', 'top'))).not.toBe(TOP_FRAME_KEY);
  });

  it('labels a frame by the name you gave it, its name attribute, or where it is', () => {
    const cart = frame('A', 'https://cart.test/embed/v2');
    expect(frameLabel(TOP, {})).toBe('shop.test');
    expect(frameLabel(cart, {})).toBe('cart.test/embed');
    expect(frameLabel(frame('B', 'https://cart.test/'), {})).toBe('cart.test');
    expect(frameLabel({ ...cart, name: 'cart' }, {})).toBe('cart');
    expect(frameLabel({ ...cart, name: 'cart' }, { 'https://cart.test/embed/v2': 'Cart service' })).toBe('Cart service');
    expect(frameLabel(TOP, { [TOP_FRAME_KEY]: 'Shell' })).toBe('Shell');
    expect(frameLabel(frame('C', 'about:blank'), {})).toBe('frame');
  });

  it("reads only the names given, never what every object has (an iframe named __proto__ or constructor)", () => {
    for (const name of ['__proto__', 'constructor', 'toString']) {
      const odd = frame('X', `data:text/html,${name}`, name);
      expect(frameLabel(odd, {})).toBe(name);
      expect(givenName({}, frameKey(odd))).toBe('');
      expect(givenName({}, name)).toBe('');
    }
  });

  it('numbers frames that would read the same', () => {
    const labels = frameLabels([TOP, frame('A', 'https://rate.test/w'), frame('B', 'https://rate.test/w'), frame('C', 'https://cart.test/')], {});
    expect([...labels.values()]).toEqual(['shop.test', 'rate.test/w', 'rate.test/w #2', 'cart.test']);
  });

  it('gives a frame one colour of the palette, the same every time', () => {
    const key = 'https://billing.test/embed';
    expect(WORKSPACE_COLORS).toContain(frameTone(key));
    expect(frameTone(key)).toBe(frameTone(key));
    expect(new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map(frameTone)).size).toBeGreaterThan(1);
  });

  it("remembers frames that went away, so their rows keep a label", () => {
    const cart = frame('A', 'https://cart.test/');
    useFrameStore.getState().setAll([TOP, cart]);
    useFrameStore.getState().setAll([TOP]);
    expect(useFrameStore.getState().frames).toEqual([TOP]);
    expect(useFrameStore.getState().seen.A).toEqual(cart);
  });
});

describe('console rows', () => {
  it('keeps the most recent rows only', () => {
    useConsoleStore.getState().setAll(Array.from({ length: MAX_CONSOLE_ENTRIES }, () => entry()));
    const last = entry();
    useConsoleStore.getState().append([last]);
    const { entries } = useConsoleStore.getState();
    expect(entries).toHaveLength(MAX_CONSOLE_ENTRIES);
    expect(entries.at(-1)).toBe(last);
  });

  it('skips rows it already has: the startup snapshot overlaps the first batch', () => {
    const [a, b, c] = [entry(), entry(), entry()];
    useConsoleStore.getState().setAll([a!, b!]);
    useConsoleStore.getState().append([b!, c!]);
    expect(useConsoleStore.getState().entries).toEqual([a, b, c]);
  });

  it("clears the rows before the top page's new load, unless Preserve log is on; an iframe's load clears nothing", () => {
    useFrameStore.getState().setAll([TOP, frame('A', 'https://cart.test/')]);
    const old = entry();
    receiveEntries([old]);
    receiveEntries([entry({ source: 'navigation', frameId: 'A' })]);
    expect(useConsoleStore.getState().entries).toHaveLength(2);

    const load = entry({ source: 'navigation', frameId: 'T' });
    const after = entry();
    receiveEntries([entry(), load, after]);
    expect(useConsoleStore.getState().entries).toEqual([load, after]);

    useConsoleFilter.getState().togglePreserveLog();
    receiveEntries([entry({ source: 'navigation', frameId: 'T' })]);
    expect(useConsoleStore.getState().entries).toHaveLength(3);
  });
});

describe('console filter', () => {
  const keyOf = (id: string | null) => ({ T: TOP_FRAME_KEY, A: 'https://cart.test/' })[id ?? ''] ?? null;
  const filter = (partial: Partial<Parameters<typeof matchesFilter>[1]> = {}) => ({ frameKeys: [], levels: DEFAULT_LEVELS, text: '', ...partial });

  it('shows the frames picked, or all of them', () => {
    const cart = entry({ frameId: 'A' });
    expect(matchesFilter(cart, filter(), keyOf)).toBe(true);
    expect(matchesFilter(cart, filter({ frameKeys: [TOP_FRAME_KEY] }), keyOf)).toBe(false);
    expect(matchesFilter(cart, filter({ frameKeys: ['https://cart.test/'] }), keyOf)).toBe(true);
  });

  it("applies levels to the page's own rows only: code you ran and page loads always show", () => {
    expect(matchesFilter(entry({ level: 'verbose' }), filter(), keyOf)).toBe(false);
    expect(matchesFilter(entry({ level: 'verbose', source: 'input' }), filter(), keyOf)).toBe(true);
    expect(matchesFilter(entry({ level: 'error', source: 'result' }), filter({ levels: { ...DEFAULT_LEVELS, error: false } }), keyOf)).toBe(true);
  });

  it('matches text in the message or where it came from, ignoring case', () => {
    const row = entry({ values: [{ kind: 'string', text: 'Payment Failed' }], location: { url: 'https://cart.test/pay.js', line: 1, column: 1, functionName: '' } });
    expect(matchesFilter(row, filter({ text: 'payment' }), keyOf)).toBe(true);
    expect(matchesFilter(row, filter({ text: 'pay.js' }), keyOf)).toBe(true);
    expect(matchesFilter(row, filter({ text: 'refund' }), keyOf)).toBe(false);
  });

  it('words the level menu as DevTools does', () => {
    expect(levelSummary(DEFAULT_LEVELS)).toBe('Default levels');
    expect(levelSummary({ verbose: true, info: true, warning: true, error: true })).toBe('All levels');
    expect(levelSummary({ verbose: false, info: false, warning: false, error: true })).toBe('Custom levels');
    expect(levelSummary({ verbose: false, info: false, warning: false, error: false })).toBe('No levels');
  });
});

describe('console panel helpers', () => {
  it('runs code in the frame picked, even beside another at the same address, and follows it by address after a reload', () => {
    const [one, two] = [frame('A', 'https://w.test/embed?id=1'), frame('B', 'https://w.test/embed?id=2')];
    expect(resolveTarget([TOP, one, two], frameKey(two), 'B')).toBe(two);
    const reloaded = frame('B2', 'https://w.test/embed?id=2');
    expect(resolveTarget([TOP, reloaded], frameKey(two), 'B')).toBe(reloaded);
    expect(resolveTarget([TOP], frameKey(two), 'B')).toBeNull();
  });

  it('times each row from the code last run before it, over all rows', () => {
    const before = entry({ time: 5 });
    const input = entry({ source: 'input', time: 10 });
    const reaction = entry({ frameId: 'A', time: 14 });
    expect(sinceInput([before, input, reaction])).toEqual(new Map([[reaction.id, 10]]));
  });

  it("counts each frame's errors and warnings", () => {
    const resolve = (id: string | null) => (id ? { key: id === 'A' ? 'cart' : 'top', label: '', url: '', gone: false } : null);
    const counts = problemCounts([entry({ level: 'error', frameId: 'A' }), entry({ level: 'warning', frameId: 'A' }), entry({ level: 'error' }), entry({ level: 'info' }), entry({ level: 'error', frameId: null })], resolve);
    expect(Object.fromEntries(counts)).toEqual({ cart: { errors: 1, warnings: 1 }, top: { errors: 1, warnings: 0 } });
  });

  it('copies a row as one line: time, frame, level, message and source', () => {
    const time = new Date(2026, 0, 1, 9, 5, 7, 42).getTime();
    const row = entry({ time, level: 'warning', values: [{ kind: 'string', text: 'low' }, { kind: 'number', text: '2' }], location: { url: 'https://cart.test/a.js', line: 3, column: 1, functionName: '' } });
    expect(rowLine(row, () => ({ key: 'k', label: 'cart', url: '', gone: false }))).toBe('09:05:07.042 [cart] warning: low 2 (https://cart.test/a.js:3)');
  });
});

describe('running code', () => {
  it('runs it in the frame and remembers it for this workspace, once per repeat', async () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) });
    promptHistory.byWorkspace.clear();
    api.evaluateInFrame.mockResolvedValue({});
    await expect(runInFrame('A', 'addItem(42)')).resolves.toBe(true);
    await runInFrame('A', 'addItem(42)');
    await runInFrame('A', '   ');
    expect(api.evaluateInFrame).toHaveBeenCalledTimes(2);
    expect(api.evaluateInFrame).toHaveBeenCalledWith('A', 'addItem(42)');
    promptHistory.byWorkspace.clear();
    expect(historyOf('w1')).toEqual(['addItem(42)']);
  });

  it("says so when the code couldn't run", async () => {
    api.evaluateInFrame.mockRejectedValue(new Error('That frame has no JavaScript running.'));
    await expect(runInFrame('A', '1')).resolves.toBe(false);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ tone: 'danger', description: 'That frame has no JavaScript running.' }));
  });
});

describe('naming frames', () => {
  it('names a frame for the active workspace at once, then saves it; an empty name takes it back', async () => {
    api.updateWorkspace.mockResolvedValue({});
    await nameFrame('https://cart.test/', '  Cart  ');
    expect(useWorkspaceStore.getState().workspaces[0]!.frameNames).toEqual({ 'https://cart.test/': 'Cart' });
    expect(api.updateWorkspace).toHaveBeenLastCalledWith('w1', { frameNames: { 'https://cart.test/': 'Cart' } });
    await nameFrame('https://cart.test/', '');
    expect(useWorkspaceStore.getState().workspaces[0]!.frameNames).toEqual({});
  });

  it('goes back to what the main process has when saving fails', async () => {
    api.updateWorkspace.mockRejectedValue(new Error('disk full'));
    api.getWorkspaces.mockResolvedValue({ activeId: 'w1', workspaces: [workspace({ top: 'Shell' })] });
    await nameFrame('https://cart.test/', 'Cart');
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ tone: 'danger' }));
    expect(useWorkspaceStore.getState().workspaces[0]!.frameNames).toEqual({ top: 'Shell' });
  });
});
