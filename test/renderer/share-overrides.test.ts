/** Exporting and importing a workspace's overrides and rules: what the toasts say, and the reload after an import. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/shared/types';
import { useSettingsStore } from '@/entities/settings';
import { exportOverrides, importOverrides } from '@/features/override/share';

const api = vi.hoisted(() => ({ exportOverrides: vi.fn(), importOverrides: vi.fn(), reload: vi.fn(async () => {}) }));
const toast = vi.hoisted(() => Object.assign(vi.fn(() => 'toast-1'), { dismiss: vi.fn(), update: vi.fn() }));

vi.mock('@/shared/api', () => ({ api, onAppEvent: () => () => {}, errorMessage: (err: unknown) => (err as Error).message }));
vi.mock('@/shared/ui/toast', () => ({ toast }));

beforeEach(() => {
  vi.clearAllMocks();
  useSettingsStore.getState().setSettings(DEFAULT_SETTINGS);
});

describe('export', () => {
  it('says what it saved, and where', async () => {
    api.exportOverrides.mockResolvedValue({ path: '/home/me/shop.test-overrides.json', overrides: 3, rules: 1 });
    await exportOverrides();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Exported 3 overrides and 1 rule', description: expect.stringContaining('Saved as shop.test-overrides.json.'), tone: 'success' }));
  });

  it('says nothing when the dialog was cancelled, and why it failed otherwise', async () => {
    api.exportOverrides.mockResolvedValue(null);
    await exportOverrides();
    expect(toast).not.toHaveBeenCalled();
    api.exportOverrides.mockRejectedValue(new Error('EACCES'));
    await exportOverrides();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Could not export the overrides', description: 'EACCES', tone: 'danger' }));
  });
});

describe('import', () => {
  it('says what it added and left out, and reloads the page', async () => {
    api.importOverrides.mockResolvedValue({ overrides: 2, rules: 1, present: 1, unreadable: 1 });
    await importOverrides();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Imported 2 overrides and 1 rule', description: "1 already in this workspace (yours kept). 1 couldn't be read. Reloading the page.", tone: 'success' }),
    );
    expect(api.reload).toHaveBeenCalledTimes(1);
  });

  it("names only what it added, and doesn't reload when nothing was, or reloading is off", async () => {
    api.importOverrides.mockResolvedValue({ overrides: 0, rules: 2, present: 0, unreadable: 0 });
    useSettingsStore.getState().setSettings({ ...DEFAULT_SETTINGS, autoReloadOnSave: false });
    await importOverrides();
    expect(toast).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Imported 2 rules', description: undefined }));

    api.importOverrides.mockResolvedValue({ overrides: 0, rules: 0, present: 4, unreadable: 0 });
    useSettingsStore.getState().setSettings(DEFAULT_SETTINGS);
    await importOverrides();
    expect(toast).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Nothing to import', description: '4 already in this workspace (yours kept).', tone: 'warning' }));
    expect(api.reload).not.toHaveBeenCalled();
  });

  it('says why a file was refused', async () => {
    api.importOverrides.mockRejectedValue(new Error("That file isn't an export of Console Editor's overrides"));
    await importOverrides();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Could not import the overrides', tone: 'danger' }));
  });
});
