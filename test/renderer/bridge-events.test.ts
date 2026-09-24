import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleAppEvent } from '@/app/model/bridge';

const api = vi.hoisted(() => ({ reload: vi.fn(async () => {}) }));
const toast = vi.hoisted(() => Object.assign(vi.fn(() => 'toast-1'), { dismiss: vi.fn(), update: vi.fn() }));

vi.mock('@/shared/api', () => ({ api, onAppEvent: () => () => {}, errorMessage: (err: unknown) => String(err) }));
vi.mock('@/shared/ui/toast', () => ({ toast }));
vi.mock('@/shared/ui/dialog', () => ({ confirm: async () => true, isConfirmOpen: () => false }));
vi.mock('@/shared/monaco', () => ({
  monaco: { editor: { createModel: () => ({}) }, Uri: { from: () => ({}) } },
  languageFor: () => 'javascript',
  editorHasFocus: () => false,
  dismissEditorWidgets: () => {},
  triggerInActiveEditor: () => {},
}));

describe('app event bridge', () => {
  beforeEach(() => {
    toast.mockClear();
    api.reload.mockClear();
  });

  it('shows one "override missed" toast per override, whose action reloads the page', async () => {
    handleAppEvent({ type: 'override-missed', overrideId: 'o1', url: 'https://a.com/app.js' });
    handleAppEvent({ type: 'override-missed', overrideId: 'o1', url: 'https://a.com/app.js?v=2' });
    expect(toast).toHaveBeenCalledTimes(2);
    const calls = toast.mock.calls as unknown as Array<[{ id: string; title: string; action: { onClick(): void } }]>;
    // Same id: the second replaces the first instead of stacking.
    expect(calls.map(([t]) => t.id)).toEqual(['missed:o1', 'missed:o1']);
    expect(calls[0]![0].title).toContain('app.js');
    calls[0]![0].action.onClick();
    await vi.waitFor(() => expect(api.reload).toHaveBeenCalledTimes(1));
  });
});
