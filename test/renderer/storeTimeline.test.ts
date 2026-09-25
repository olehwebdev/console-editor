import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StackFrame, StoreAction } from '../../src/shared/types';
import { appFrame, locationKey, useInspectorStore, useStoreLog } from '@/entities/inspector';

const api = vi.hoisted(() => ({ recordStores: vi.fn(), getSourceMap: vi.fn() }));
const toast = vi.hoisted(() => vi.fn());
vi.mock('@/shared/api', () => ({ api, onAppEvent: () => () => {}, errorMessage: (err: unknown) => (err as Error).message }));
vi.mock('@/shared/ui/toast', () => ({ toast: Object.assign(toast, { dismiss: vi.fn(), update: vi.fn() }) }));
// The tab store's model registry loads Monaco, which needs a browser.
vi.mock('@/shared/monaco', () => ({ monaco: {}, languageFor: () => 'javascript', requestReveal: vi.fn() }));

const { handleAppEvent } = await import('@/app/model/bridge');
const { clearStores, recordStores } = await import('@/features/inspect/stores');

const APP_JS = 'https://site.test/app.js';
const frame = (column: number, name = ''): StackFrame => ({ name, url: APP_JS, line: 0, column });
const place = (url: string) => ({ bundleUrl: APP_JS, url, line: 1, column: 1, name: null, rawOffset: null });
const action = (id: number, over: Partial<StoreAction> = {}): StoreAction => ({
  id,
  frameId: 'top',
  at: 0,
  store: 'Redux',
  library: 'redux',
  type: 'cart/added',
  payload: '"A1"',
  changes: [],
  duration: null,
  stack: [frame(10, 'dispatch'), frame(20, 'handleAdd')],
  ...over,
});

describe('store timelines (renderer)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getSourceMap.mockResolvedValue({ status: 'none', bundleHash: 'h' });
    useStoreLog.setState({ recording: false, actions: [] });
    useInspectorStore.setState({ origins: {} });
  });

  it('follows recording, keeps the actions it is sent, and traces the calls of their stacks', async () => {
    handleAppEvent({ type: 'stores-recording', recording: true });
    expect(useStoreLog.getState().recording).toBe(true);
    handleAppEvent({ type: 'stores-recorded', actions: [action(1), action(2)] });
    expect(useStoreLog.getState().actions.map((a) => a.id)).toEqual([1, 2]);
    // Each call once, whatever the actions that share it.
    await vi.waitFor(() => expect(Object.keys(useInspectorStore.getState().origins)).toHaveLength(2));
    expect(api.getSourceMap).toHaveBeenCalledWith(expect.objectContaining({ bundleUrl: APP_JS }));
    clearStores();
    expect(useStoreLog.getState()).toMatchObject({ recording: true, actions: [] });
  });

  it("keeps the last actions only; says so when recording can't start", async () => {
    useStoreLog.getState().add(Array.from({ length: 1005 }, (_, i) => action(i + 1)));
    expect(useStoreLog.getState().actions).toHaveLength(1000);
    expect(useStoreLog.getState().actions[0]!.id).toBe(6);
    api.recordStores.mockRejectedValueOnce(new Error('no page'));
    await recordStores(true);
    expect(toast.mock.calls[0]![0]).toMatchObject({ title: "Couldn't start recording store actions", description: 'no page' });
  });

  it("finds the app's own call in a dispatch's stack: the first whose original isn't a library's", () => {
    const stack = [frame(10, 'dispatch'), frame(20, 'handleAdd'), frame(30, 'onClick')];
    // No map says anything: the innermost call.
    expect(appFrame(stack, {})).toEqual(stack[0]);
    expect(appFrame([], {})).toBeNull();
    const origins = {
      [locationKey(stack[0]!)]: place('https://site.test/node_modules/redux/dist/redux.mjs'),
      [locationKey(stack[1]!)]: place('https://site.test/src/CartItem.tsx'),
      [locationKey(stack[2]!)]: null,
    };
    expect(appFrame(stack, origins)).toEqual(stack[1]);
    // Only libraries: none is the app's.
    expect(appFrame([stack[0]!], origins)).toBeNull();
  });
});
