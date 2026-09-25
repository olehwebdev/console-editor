import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConsoleAction, ConsoleEntry, ConsoleFrame } from '../../src/shared/types';
import { findFrame, keyLabel, locateTarget, useFrameStore } from '@/entities/frame';
import { deleteAction, duplicateAction, startFromCode, useActionEditor } from '@/features/action/edit';
import { saveAction } from '@/features/action/edit/model/saveAction';
import { runAction, useActionRuns } from '@/features/action/run';
import { actionGroup } from '@/widgets/command-palette/model/actionGroup';

const api = vi.hoisted(() => ({ evaluateInFrame: vi.fn(), createAction: vi.fn(), updateAction: vi.fn(), deleteAction: vi.fn() }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { dismiss: vi.fn(), update: vi.fn() }));
const confirm = vi.hoisted(() => vi.fn(async () => true));
vi.mock('@/shared/api', () => ({ api, onAppEvent: () => () => {}, errorMessage: (err: unknown) => (err as Error).message }));
vi.mock('@/shared/ui/toast', () => ({ toast }));
vi.mock('@/shared/ui/dialog', () => ({ confirm, isConfirmOpen: () => false }));

const CART_URL = 'http://cart.localhost:5174/services/cart.html';
const TOP: ConsoleFrame = { id: 'T', url: 'http://127.0.0.1:5174/services.html', name: '', canRun: true };
const frame = (id: string, url: string, name = '', canRun = true): ConsoleFrame => ({ id, parentId: 'T', url, name, canRun });
const CART = frame('C', CART_URL, 'cart');
const BILLING = frame('B', 'http://billing.localhost:5174/services/billing.html', 'billing');

const action = (extra: Partial<ConsoleAction> = {}): ConsoleAction => ({
  id: 'a1',
  name: 'Add A1',
  target: CART_URL,
  targetName: 'cart',
  code: "addItem('A1')",
  createdAt: 1,
  updatedAt: 1,
  ...extra,
});
const result = (text: string, level: ConsoleEntry['level'] = 'info'): ConsoleEntry => ({ id: 9, frameId: 'C', level, source: 'result', time: 1, values: [{ kind: 'string', text }] });

beforeEach(() => {
  vi.clearAllMocks();
  useFrameStore.setState({ frames: [TOP, CART, BILLING], seen: {} });
  useActionRuns.setState({ runs: {} });
  useActionEditor.setState({ editing: null });
});

describe('where an action runs', () => {
  it('finds its frame by key, else an iframe by its name attribute, preferring one that can run code', () => {
    expect(findFrame([TOP, CART], CART_URL, 'cart')).toBe(CART);
    expect(findFrame([TOP, CART], 'top', '')).toBe(TOP);
    // The cart moved to another path: its iframe is still name="cart".
    const moved = frame('C2', 'http://cart.localhost:5174/v2/cart.html', 'cart');
    expect(findFrame([TOP, moved], CART_URL, 'cart')).toBe(moved);
    expect(findFrame([TOP, moved], CART_URL, '')).toBeNull();
    // The top page is never taken for an iframe by name.
    expect(findFrame([{ ...TOP, name: 'cart' }], CART_URL, 'cart')).toBeNull();
    const sandboxed = frame('S', CART_URL, 'cart', false);
    expect(findFrame([TOP, sandboxed, CART], CART_URL, 'cart')).toBe(CART);
    expect(findFrame([TOP, sandboxed], CART_URL, 'cart')).toBe(sandboxed);
  });

  it("labels a frame that isn't on the page by the name you gave it, its name attribute, or its key", () => {
    expect(keyLabel(CART_URL, { [CART_URL]: 'Cart service' }, 'cart')).toBe('Cart service');
    expect(keyLabel('top', {})).toBe('page');
    expect(keyLabel(CART_URL, {}, 'cart')).toBe('cart');
    expect(keyLabel('name:ads', {})).toBe('ads');
    expect(keyLabel(CART_URL, {})).toBe('cart.localhost:5174/services');
    expect(keyLabel('id:F1', {})).toBe('frame');
  });

  it('labels it as the console does while it is on the page', () => {
    expect(locateTarget([TOP, CART], {}, CART_URL, 'cart')).toEqual({ frame: CART, label: 'cart' });
    expect(locateTarget([TOP, CART], { [CART_URL]: 'Cart service' }, CART_URL, 'cart').label).toBe('Cart service');
    expect(locateTarget([TOP], {}, CART_URL, 'cart')).toEqual({ frame: null, label: 'cart' });
  });
});

describe('running an action', () => {
  it('runs its code in its frame and keeps what came back', async () => {
    let answer: (entry: ConsoleEntry) => void = () => undefined;
    api.evaluateInFrame.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
    const run = runAction(action());
    expect(api.evaluateInFrame).toHaveBeenCalledWith('C', "addItem('A1')");
    expect(useActionRuns.getState().runs.a1).toEqual({ state: 'running' });
    // A second press while it runs doesn't run it again.
    await runAction(action());
    expect(api.evaluateInFrame).toHaveBeenCalledTimes(1);
    answer(result('undefined'));
    await run;
    expect(useActionRuns.getState().runs.a1).toEqual({ state: 'done', entry: result('undefined') });
  });

  it("says why it couldn't run", async () => {
    useFrameStore.setState({ frames: [TOP] });
    await runAction(action());
    expect(useActionRuns.getState().runs.a1).toEqual({ state: 'failed', message: "Its frame isn't on the page." });

    useFrameStore.setState({ frames: [TOP, { ...CART, canRun: false }] });
    await runAction(action());
    expect(useActionRuns.getState().runs.a1).toEqual({ state: 'failed', message: 'Its frame runs no JavaScript.' });
    expect(api.evaluateInFrame).not.toHaveBeenCalled();

    useFrameStore.setState({ frames: [TOP, CART] });
    api.evaluateInFrame.mockRejectedValueOnce(new Error('That frame has no JavaScript running.'));
    await runAction(action());
    expect(useActionRuns.getState().runs.a1).toEqual({ state: 'failed', message: 'That frame has no JavaScript running.' });
  });
});

describe('editing actions', () => {
  it('opens the form afresh each time, on a new action or one of the list', () => {
    const { startNew, startEdit, close } = useActionEditor.getState();
    startNew();
    const blank = useActionEditor.getState().editing!;
    expect(blank).toMatchObject({ id: null, start: { name: '', target: 'top', targetName: '', code: '' } });
    startEdit(action());
    const editing = useActionEditor.getState().editing!;
    expect(editing).toMatchObject({ id: 'a1', start: { name: 'Add A1', target: CART_URL, targetName: 'cart', code: "addItem('A1')" } });
    expect(editing.session).toBeGreaterThan(blank.session);
    close();
    expect(useActionEditor.getState().editing).toBeNull();
  });

  it('starts from code you ran: in its frame, named after its first line', () => {
    startFromCode("  addItem('A1')\nconsole.log('done')", CART);
    expect(useActionEditor.getState().editing?.start).toEqual({ name: "addItem('A1')", target: CART_URL, targetName: 'cart', code: "  addItem('A1')\nconsole.log('done')" });
    startFromCode('checkout()', TOP);
    expect(useActionEditor.getState().editing?.start).toMatchObject({ target: 'top', targetName: '' });
    startFromCode('x'.repeat(100), undefined);
    expect(useActionEditor.getState().editing?.start).toMatchObject({ name: 'x'.repeat(60), target: 'top' });
  });

  it('saves a new action or a change, closing the form, and keeps it open when that fails', async () => {
    const input = { name: 'Add A1', target: CART_URL, targetName: 'cart', code: "addItem('A1')" };
    useActionEditor.getState().startNew(input);
    expect(await saveAction(null, input)).toBe(true);
    expect(api.createAction).toHaveBeenCalledWith(input);
    expect(useActionEditor.getState().editing).toBeNull();

    useActionEditor.getState().startEdit(action());
    api.updateAction.mockRejectedValueOnce(new Error('An action needs a name'));
    expect(await saveAction('a1', { ...input, name: '' })).toBe(false);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Could not save the action', description: 'An action needs a name' }));
    expect(useActionEditor.getState().editing?.id).toBe('a1');
  });

  it('deletes an action once confirmed, closing its form', async () => {
    confirm.mockResolvedValueOnce(false);
    await deleteAction(action());
    expect(api.deleteAction).not.toHaveBeenCalled();

    useActionEditor.getState().startEdit(action());
    await deleteAction(action());
    expect(api.deleteAction).toHaveBeenCalledWith('a1');
    expect(useActionEditor.getState().editing).toBeNull();
  });

  it('copies an action under a name that still fits', async () => {
    await duplicateAction(action({ name: 'n'.repeat(60) }));
    const copy = api.createAction.mock.calls[0]![0];
    expect(copy).toEqual({ name: `${'n'.repeat(55)} copy`, target: CART_URL, targetName: 'cart', code: "addItem('A1')" });
  });
});

describe('the palette', () => {
  it('lists each action with its frame, runs the one picked, and offers a new one', () => {
    const onNew = vi.fn();
    const group = actionGroup([action(), action({ id: 'a2', name: 'Pay', target: 'top', targetName: '' })], [TOP, CART], {}, onNew);
    expect(group.items.map((i) => [i.label, i.hint])).toEqual([
      ['Add A1', 'in cart'],
      ['Pay', 'in 127.0.0.1:5174'],
      ['New action…', undefined],
    ]);
    group.items[0]!.onSelect();
    expect(api.evaluateInFrame).toHaveBeenCalledWith('C', "addItem('A1')");
    group.items[2]!.onSelect();
    expect(onNew).toHaveBeenCalled();
  });
});
