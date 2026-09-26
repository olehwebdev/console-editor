import { describe, expect, it } from 'vitest';
import type { CdpTransport } from '../../src/main/engine/cdp';
import { MAX_PLACED_FUNCTIONS, MAX_SCRIPT_URL } from '../../src/main/inspector/constants';
import { functionLocations } from '../../src/main/inspector/reading/functionLocations';
import { ScriptUrls } from '../../src/main/inspector/reading/ScriptUrls';
import { MAX_INITIATOR_FRAMES, MAX_INITIATOR_NAME, MAX_INITIATOR_URL } from '../../src/main/network/constants';
import { initiatorFrames } from '../../src/main/network/initiatorFrames';

type Handler = (params: never) => void;

/** A transport answering `send` from a function, with events emitted to its listeners. */
function fakeTransport(answer: (method: string, params: Record<string, unknown> | undefined, emit: (event: string, params: unknown) => void) => unknown) {
  const handlers = new Map<string, Set<Handler>>();
  const emit = (event: string, params: unknown) => handlers.get(event)?.forEach((h) => h(params as never));
  const calls: string[] = [];
  const transport = {
    send: async (method: string, params?: Record<string, unknown>) => {
      calls.push(method);
      return answer(method, params, emit);
    },
    on: (event: string, handler: Handler) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler);
      return () => handlers.get(event)?.delete(handler);
    },
  } as unknown as CdpTransport;
  return { transport, calls };
}

describe("the main process's lookups stay bounded", () => {
  it("keeps the scripts alive as each replay lists them, whether each names a map, and no URL past the most", async () => {
    const script = (scriptId: string, url: string, sourceMapURL = '') => ({ scriptId, url, sourceMapURL, executionContextAuxData: { frameId: 'top', isDefault: true } });
    // An inline map's URL is the whole map.
    let alive = [script('1', 'https://a.test/app.js', `data:application/json;base64,${'x'.repeat(100_000)}`), script('2', `https://a.test/${'y'.repeat(MAX_SCRIPT_URL)}.js`)];
    const { transport } = fakeTransport((method, _params, emit) => {
      if (method === 'Debugger.enable') alive.forEach((parsed) => emit('Debugger.scriptParsed', parsed));
      return {};
    });
    const scripts = new ScriptUrls(transport);
    expect(await scripts.url('1')).toBe('https://a.test/app.js');
    expect(await scripts.url('2')).toBeNull();
    expect(await scripts.ofFrame('top')).toEqual([
      { url: 'https://a.test/app.js', mapped: true, frameId: 'top' },
      { url: '', mapped: false, frameId: 'top' },
    ]);
    // The page moved on: its scripts went with it.
    alive = [script('3', 'https://a.test/next.js')];
    expect(await scripts.ofFrame('top')).toEqual([{ url: 'https://a.test/next.js', mapped: false, frameId: 'top' }]);
  });

  it(`places at most ${MAX_PLACED_FUNCTIONS} functions in one read, and one that went away doesn't lose the others`, async () => {
    const count = MAX_PLACED_FUNCTIONS + 5;
    const { transport, calls } = fakeTransport((_method, params) => {
      if (params?.objectId === 'array') return { result: Array.from({ length: count }, (_, i) => ({ name: String(i), value: { objectId: `f${i}` } })).concat({ name: 'length', value: { objectId: '' } }) };
      if (params?.objectId === 'f1') throw new Error('Could not find object with given id');
      return { result: [], internalProperties: [{ name: '[[FunctionLocation]]', value: { value: { scriptId: '1', lineNumber: Number(String(params?.objectId).slice(1)), columnNumber: 2 } } }] };
    });
    const scripts = { url: async () => 'https://a.test/app.js' } as unknown as ScriptUrls;
    const locations = await functionLocations(transport, 'array', scripts);
    expect(locations).toHaveLength(count);
    expect(locations[0]).toEqual({ url: 'https://a.test/app.js', line: 0, column: 2 });
    expect(locations[1]).toBeNull();
    expect(locations[MAX_PLACED_FUNCTIONS - 1]).toEqual({ url: 'https://a.test/app.js', line: MAX_PLACED_FUNCTIONS - 1, column: 2 });
    expect(locations[MAX_PLACED_FUNCTIONS]).toBeNull();
    expect(calls.filter((m) => m === 'Runtime.getProperties')).toHaveLength(1 + MAX_PLACED_FUNCTIONS);
  });

  it("keeps a request's initiator calls with bounded URLs and names", () => {
    const call = (functionName: string, url: string) => ({ functionName, scriptId: '1', url, lineNumber: 1, columnNumber: 2 });
    const long = `https://a.test/${'q'.repeat(MAX_INITIATOR_URL)}.js`;
    const frames = initiatorFrames({ type: 'script', stack: { callFrames: [call('x'.repeat(MAX_INITIATOR_NAME + 50), 'https://a.test/app.js'), call('fromLong', long), ...Array.from({ length: 30 }, () => call('f', 'https://a.test/app.js'))] } });
    expect(frames[0]!.name).toHaveLength(MAX_INITIATOR_NAME);
    expect(frames.some((frame) => frame.url === long)).toBe(false);
    expect(frames).toHaveLength(MAX_INITIATOR_FRAMES);
  });
});
