import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentTreeLevel, InspectedComponent, RenderCommit, RenderedComponent } from '../../src/shared/types';
import { hookName, lastRendered, locationKey, pathKey, renderedWhy, renderKey, treeRows, triggerLabel, useInspectorStore, useRenderLog, useTreeStore } from '@/entities/inspector';

const api = vi.hoisted(() => ({ componentTree: vi.fn(), openTreeNode: vi.fn(), highlightTreeNode: vi.fn(), setComponentState: vi.fn(), recordRenders: vi.fn(), getSourceMap: vi.fn() }));
const toast = vi.hoisted(() => vi.fn());
vi.mock('@/shared/api', () => ({ api, onAppEvent: () => () => {}, errorMessage: (err: unknown) => (err as Error).message }));
vi.mock('@/shared/ui/toast', () => ({ toast: Object.assign(toast, { dismiss: vi.fn(), update: vi.fn() }) }));
// The tab store's model registry loads Monaco, which needs a browser.
vi.mock('@/shared/monaco', () => ({ monaco: {}, languageFor: () => 'javascript', requestReveal: vi.fn() }));

const { handleAppEvent } = await import('@/app/model/bridge');
const { chooseFrame, openNode, revealInTree, toggleNode } = await import('@/features/inspect/tree');
const { setStateValue } = await import('@/features/inspect/pick');

const APP_JS = 'https://site.test/app.js';
const at = (column: number) => ({ url: APP_JS, line: 0, column });
const rendered = (over: Partial<RenderedComponent> = {}): RenderedComponent => ({ name: 'Sd', key: null, location: at(10), kind: 'render', memo: false, reasons: [], ...over });
const commit = (id: number, components: RenderedComponent[], frameId = 'top'): RenderCommit => ({ id, frameId, at: 0, duration: null, trigger: null, components, more: 0 });
const node = (name: string, children = 0) => ({ framework: 'react' as const, name, key: null, location: null, children });
const level = (path: number[], names: string[], more = 0): ComponentTreeLevel => ({ frameId: 'top', path, nodes: names.map((name) => node(name, 1)), more });

describe('why components rendered (entities/inspector)', () => {
  it('says why a component took part in a commit, naming hooks once their names are known', () => {
    expect(renderedWhy(rendered({ kind: 'mount' }), undefined)).toBe('mounted');
    expect(renderedWhy(rendered({ kind: 'skip', memo: true }), undefined)).toBe('skipped: memo, props equal');
    expect(renderedWhy(rendered({ kind: 'skip' }), undefined)).toBe('skipped: same props');
    const state = rendered({ reasons: [{ kind: 'state', changes: [{ name: '2', from: '1', to: '2' }] }, { kind: 'store', changes: [{ name: '1', from: '0', to: '1' }] }] });
    expect(renderedWhy(state, undefined)).toBe('state #2 1 → 2; store #1 0 → 1');
    expect(renderedWhy(state, ['count', 'qty'])).toBe('state qty 1 → 2; store count 0 → 1');
    expect(renderedWhy(rendered({ reasons: [{ kind: 'props', changes: [{ name: '2', from: '"a"', to: '"b"' }] }] }), ['count', 'qty'])).toBe('props 2 "a" → "b"');
    expect(renderedWhy(rendered({ reasons: [{ kind: 'context', changes: [{ name: 'Theme', from: '"dark"', to: '"light"' }] }] }), undefined)).toBe('context Theme "dark" → "light"');
    expect(renderedWhy(rendered({ reasons: [{ kind: 'parent', changes: [] }] }), undefined)).toBe('its parent rendered');
    expect(hookName('ticks', ['x'])).toBe('ticks');
  });

  it('says what triggered a commit, and which components the last commit of a frame rendered', () => {
    expect(triggerLabel({ type: 'click', target: 'button#add' })).toBe('click on button#add');
    expect(triggerLabel({ type: 'message', target: null })).toBe('message');
    expect(triggerLabel(null)).toBeNull();
    const commits = [commit(1, [rendered({ location: at(1) })]), commit(2, [rendered({ location: at(2), key: 'A1' }), rendered({ location: at(3), kind: 'skip' })]), commit(3, [rendered({ location: at(4) })], 'child')];
    expect([...lastRendered(commits, 'top')]).toEqual([renderKey(at(2), 'A1')]);
  });

  it('keeps the newest commits only, and clears them', () => {
    useRenderLog.setState({ commits: [] });
    useRenderLog.getState().add(Array.from({ length: 2100 }, (_, i) => commit(i + 1, [])));
    expect(useRenderLog.getState().commits).toHaveLength(2000);
    expect(useRenderLog.getState().commits[0]!.id).toBe(101);
    useRenderLog.getState().clear();
    expect(useRenderLog.getState().commits).toEqual([]);
  });

  it('follows recording from the main process, and traces the functions of the commits it records to the originals', async () => {
    api.getSourceMap.mockResolvedValue({ status: 'none' });
    useInspectorStore.setState({ origins: {} });
    handleAppEvent({ type: 'renders-recording', recording: true });
    handleAppEvent({ type: 'renders-recorded', commits: [commit(1, [rendered({ location: at(10) }), rendered({ location: at(10), key: 'B2' })])] });
    expect(useRenderLog.getState()).toMatchObject({ recording: true, commits: [{ id: 1 }] });
    // One look per function, not per component.
    await vi.waitFor(() => expect(Object.keys(useInspectorStore.getState().origins)).toEqual([locationKey(at(10))]));
  });
});

describe('the Components tree (features/inspect/tree)', () => {
  beforeEach(() => {
    useTreeStore.setState({ frameId: null, levels: {}, expanded: {}, selected: null });
    vi.clearAllMocks();
  });

  it('lists the rows as far as the tree is open, with how many a level leaves out', () => {
    const levels = { '': level([], ['App', 'Other']), '0': level([0], ['List'], 4), '0/0': level([0, 0], ['Item']) };
    const rows = treeRows(levels, { '0': true, '0/0': false });
    expect(rows.map((row) => (row.kind === 'node' ? `${row.depth}:${row.node.name}` : `${row.depth}:+${row.more}`))).toEqual(['0:App', '1:List', '1:+4', '0:Other']);
  });

  it("shows a frame's top components, opens a node once (reading it the first time) and closes it", async () => {
    api.componentTree.mockImplementation(async (_frameId: string, path: number[]) => level(path, path.length ? ['Child'] : ['App']));
    await chooseFrame('top');
    expect(useTreeStore.getState()).toMatchObject({ frameId: 'top', levels: { '': { nodes: [{ name: 'App' }] } } });
    expect(await toggleNode([0])).toHaveLength(1);
    expect(useTreeStore.getState().expanded).toEqual({ '0': true });
    await toggleNode([0]);
    await toggleNode([0]);
    expect(api.componentTree).toHaveBeenCalledTimes(2);
  });

  it('drops a level read for a frame no longer shown', async () => {
    let answer: (level: ComponentTreeLevel) => void = () => {};
    api.componentTree.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
    const first = chooseFrame('top');
    useTreeStore.getState().setFrame('child');
    answer(level([], ['App']));
    expect(await first).toEqual([]);
    expect(useTreeStore.getState().levels).toEqual({});
  });

  it("reveals a picked component: its frame's levels down to it read again, opened, and it selected", async () => {
    api.componentTree.mockImplementation(async (_frameId: string, path: number[]) => level(path, ['A', 'B', 'C']));
    const component = { frameId: 'top', path: [0, 2, 1] } as InspectedComponent;
    expect(await revealInTree(component)).toHaveLength(3);
    expect(api.componentTree.mock.calls.map(([, path]) => path)).toEqual([[], [0], [0, 2]]);
    expect(useTreeStore.getState()).toMatchObject({ frameId: 'top', expanded: { '0': true, '0/2': true }, selected: pathKey([0, 2, 1]) });
    expect(await revealInTree({ frameId: 'top', path: null } as InspectedComponent)).toEqual([]);
  });

  it('reads the tree afresh once a root frame commits a new document', () => {
    useTreeStore.setState({ frameId: 'top', levels: { '': level([], ['App']) }, expanded: { '0': true }, selected: '0' });
    // Dropping the page's files queues their removal for the next frame.
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    handleAppEvent({ type: 'navigated', url: 'https://site.test/next' });
    vi.unstubAllGlobals();
    expect(useTreeStore.getState()).toMatchObject({ frameId: null, levels: {}, expanded: {}, selected: null });
  });

  it('opens a node as a pick, selecting it; says so when it has no element', async () => {
    useTreeStore.getState().setFrame('top');
    api.openTreeNode.mockResolvedValueOnce({ pickId: '4' });
    expect(await openNode([1])).toEqual({ pickId: '4' });
    expect(api.openTreeNode).toHaveBeenCalledWith('top', [1]);
    expect(useTreeStore.getState().selected).toBe('1');
    api.openTreeNode.mockRejectedValueOnce(new Error('That component renders no element'));
    expect(await openNode([2])).toBeNull();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Couldn't open that component", tone: 'danger' }));
  });
});

describe('setting state (features/inspect/pick)', () => {
  it('sets a value of the component shown and shows it as rendered; says why when it cannot', async () => {
    useInspectorStore.setState({ component: { pickId: '3', depth: 1 } as InspectedComponent });
    api.setComponentState.mockResolvedValueOnce({ pickId: '3', depth: 1, state: [{ name: '1', preview: '5' }] });
    expect(await setStateValue({ kind: 'state', name: '1', json: '5' })).toBe(true);
    expect(api.setComponentState).toHaveBeenCalledWith('3', 1, { kind: 'state', name: '1', json: '5' });
    expect(useInspectorStore.getState().component?.state).toEqual([{ name: '1', preview: '5' }]);
    api.setComponentState.mockRejectedValueOnce(new Error('Write the new value as JSON'));
    expect(await setStateValue({ kind: 'state', name: '1', json: 'five' })).toBe(false);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Couldn't set that value", description: 'Write the new value as JSON' }));
  });
});
