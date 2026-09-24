import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AvailableUpdate, UpdateState } from '@common/types';
import { RELEASES, selectOfferedUpdate, useUpdateStore } from '@/entities/app-update';
import { selectActivePage, useTabStore } from '@/entities/editor-tab';
import { checkForUpdatesNow, handleUpdateState, startUpdates, WHATS_NEW_TAB } from '@/features/update-app';

const api = vi.hoisted(() => ({
  checkForUpdates: vi.fn(),
  downloadUpdate: vi.fn(async () => {}),
  installUpdate: vi.fn(async () => {}),
  getAppInfo: vi.fn(),
  getUpdateState: vi.fn(),
  openExternal: vi.fn(async () => {}),
}));
const toast = vi.hoisted(() => Object.assign(vi.fn(() => 'app-update'), { dismiss: vi.fn(), update: vi.fn() }));

vi.mock('@/shared/api', () => ({ api, onAppEvent: () => () => {}, errorMessage: (err: unknown) => String(err) }));
vi.mock('@/shared/ui/toast', () => ({ toast }));
vi.mock('@/shared/monaco', () => ({
  monaco: { editor: { createModel: () => ({}) }, Uri: { from: () => ({}) } },
  languageFor: () => 'javascript',
}));

interface ToastCall {
  id: string;
  title: string;
  description?: string;
  action?: { label: string; onClick(): void };
  secondaryAction?: { label: string; onClick(): void };
  duration?: number;
}
const lastToast = () => (toast.mock.calls.at(-1) as unknown as [ToastCall])[0];

const update = (install: 'auto' | 'manual' = 'auto', version = '0.2.0', installsOnQuit = install === 'auto'): AvailableUpdate => ({
  version,
  notes: '- New things.',
  releaseUrl: `https://github.com/olehwebdev/console-editor/releases/tag/v${version}`,
  install,
  installsOnQuit,
});

beforeEach(async () => {
  toast.mockClear();
  toast.dismiss.mockClear();
  for (const fn of Object.values(api)) fn.mockClear();
  useTabStore.setState({ tabs: [], pages: [], activeId: null, diff: 'off' });
  // A manual check forgets which version was announced, so each test starts fresh.
  api.checkForUpdates.mockResolvedValueOnce({ status: 'idle' } satisfies UpdateState);
  await checkForUpdatesNow();
  toast.mockClear();
  useUpdateStore.setState({ state: { status: 'idle' }, info: null });
});

describe('update notifications', () => {
  it('announces a new release once, with a download that installs and a way to its notes', async () => {
    handleUpdateState({ status: 'available', update: update() });
    handleUpdateState({ status: 'available', update: update() });
    expect(toast).toHaveBeenCalledOnce();
    const shown = lastToast();
    expect(shown).toMatchObject({ id: 'app-update', title: 'Console Editor 0.2.0 is available', duration: 0 });
    expect(shown.action?.label).toBe('Download and install');
    expect(shown.secondaryAction?.label).toBe("What's new");

    shown.action!.onClick();
    expect(api.downloadUpdate).toHaveBeenCalledOnce();
    shown.secondaryAction!.onClick();
    expect(selectActivePage(useTabStore.getState())?.id).toBe(WHATS_NEW_TAB);
  });

  it('announces a newer release after the one it announced', () => {
    handleUpdateState({ status: 'available', update: update() });
    handleUpdateState({ status: 'available', update: update('auto', '0.3.0') });
    expect(toast).toHaveBeenCalledTimes(2);
    expect(lastToast().title).toBe('Console Editor 0.3.0 is available');
  });

  it('says a .deb or .rpm installs on restart, after a password, and not on quit', () => {
    handleUpdateState({ status: 'available', update: update('auto', '0.2.0', false) });
    expect(lastToast().description).toBe('It downloads in the background; restarting installs it, after asking for your password.');
    handleUpdateState({ status: 'downloading', update: update('auto', '0.2.0', false), percent: 99 });
    handleUpdateState({ status: 'ready', update: update('auto', '0.2.0', false) });
    expect(lastToast().description).toBe('Restart to install it (it asks for your password). Unsaved edits are kept as drafts.');
  });

  it('only offers a download where the app cannot install it itself', () => {
    handleUpdateState({ status: 'available', update: update('manual') });
    expect(lastToast().action?.label).toBe('Download');
  });

  it('moves progress to the status bar, then offers the restart', async () => {
    handleUpdateState({ status: 'available', update: update() });
    handleUpdateState({ status: 'downloading', update: update(), percent: 0 });
    handleUpdateState({ status: 'downloading', update: update(), percent: 50 });
    expect(toast.dismiss).toHaveBeenCalledOnce();
    handleUpdateState({ status: 'ready', update: update() });
    expect(lastToast()).toMatchObject({ title: 'Console Editor 0.2.0 is ready to install', action: { label: 'Restart now' } });
    lastToast().action!.onClick();
    expect(api.installUpdate).toHaveBeenCalledOnce();
  });

  it('points to the downloaded file where you install it', () => {
    handleUpdateState({ status: 'downloading', update: update('manual'), percent: 90 });
    handleUpdateState({ status: 'ready', update: update('manual'), file: '/Users/me/Downloads/console-editor-0.2.0-mac-arm64.dmg' });
    expect(lastToast()).toMatchObject({ title: 'Console Editor 0.2.0 downloaded', action: { label: 'Open again' } });
    expect(lastToast().description).toContain('drag Console Editor into Applications');
  });

  it('offers to try again after a failed download or install', () => {
    handleUpdateState({ status: 'downloading', update: update(), percent: 20 });
    handleUpdateState({ status: 'error', during: 'download', message: "Couldn't download the update: socket hang up", update: update() });
    expect(lastToast()).toMatchObject({ title: "Couldn't download the update", description: 'socket hang up', action: { label: 'Try again' } });

    handleUpdateState({ status: 'ready', update: update() });
    handleUpdateState({ status: 'error', during: 'install', message: "Couldn't install the update: authentication dismissed", update: update() });
    expect(lastToast()).toMatchObject({ title: "Couldn't install the update", description: 'authentication dismissed' });
    lastToast().action!.onClick();
    expect(api.downloadUpdate).toHaveBeenCalledOnce();
    // The page keeps the update on offer, with its Try again.
    expect(selectOfferedUpdate(useUpdateStore.getState())?.version).toBe('0.2.0');
  });

  it('stays quiet about a failed automatic check', () => {
    handleUpdateState({ status: 'error', during: 'check', message: "Couldn't check for updates: offline" });
    expect(toast).not.toHaveBeenCalled();
  });
});

describe('Help › Check for Updates', () => {
  it('says when the app is up to date, or why it could not check', async () => {
    api.checkForUpdates.mockResolvedValueOnce({ status: 'up-to-date', version: '0.1.0' });
    await checkForUpdatesNow();
    expect(lastToast()).toMatchObject({ title: "You're up to date", description: 'Console Editor 0.1.0 is the latest version.' });

    api.checkForUpdates.mockResolvedValueOnce({ status: 'error', during: 'check', message: "Couldn't check for updates: GitHub answered 500" });
    await checkForUpdatesNow();
    expect(lastToast()).toMatchObject({ title: "Couldn't check for updates", description: 'GitHub answered 500' });

    api.checkForUpdates.mockRejectedValueOnce(new Error('ipc gone'));
    await checkForUpdatesNow();
    expect(lastToast().title).toBe("Couldn't check for updates");
  });

  it('announces an update again when asked, even one already announced', async () => {
    handleUpdateState({ status: 'available', update: update() });
    api.checkForUpdates.mockResolvedValueOnce({ status: 'available', update: update() });
    await checkForUpdatesNow();
    expect(toast).toHaveBeenCalledTimes(2);
    expect(useUpdateStore.getState().state.status).toBe('available');
  });

  it('says a download is already under way', async () => {
    api.checkForUpdates.mockResolvedValueOnce({ status: 'downloading', update: update(), percent: 42 });
    await checkForUpdatesNow();
    expect(lastToast()).toMatchObject({ title: 'Downloading Console Editor 0.2.0…', description: '42% so far. The status bar shows its progress.' });
  });

  it('keeps a failed check to its own toast, without offering to download again', async () => {
    handleUpdateState({ status: 'available', update: update() });
    toast.mockClear();
    handleUpdateState({ status: 'error', during: 'check', message: "Couldn't check for updates: offline", update: update() });
    expect(toast).not.toHaveBeenCalled();
    expect(selectOfferedUpdate(useUpdateStore.getState())?.version).toBe('0.2.0');
  });

  it('explains that a build run from source does not update itself', async () => {
    api.checkForUpdates.mockResolvedValueOnce({ status: 'disabled' });
    await checkForUpdatesNow();
    expect(lastToast().title).toBe('Updates come to installed copies');
  });
});

describe("What's New", () => {
  it('opens by itself on the first start after an update', async () => {
    api.getAppInfo.mockResolvedValueOnce({ version: '0.2.0', updatedFrom: '0.1.0' });
    api.getUpdateState.mockResolvedValueOnce({ status: 'up-to-date', version: '0.2.0' });
    await startUpdates();
    expect(useUpdateStore.getState().info).toEqual({ version: '0.2.0', updatedFrom: '0.1.0' });
    expect(selectActivePage(useTabStore.getState())?.id).toBe(WHATS_NEW_TAB);
  });

  it('stays closed on other starts', async () => {
    api.getAppInfo.mockResolvedValueOnce({ version: '0.2.0', updatedFrom: null });
    api.getUpdateState.mockResolvedValueOnce({ status: 'idle' });
    await startUpdates();
    expect(useTabStore.getState().pages).toEqual([]);
  });

  it('lists the released versions from CHANGELOG.md, not the unreleased work', () => {
    expect(RELEASES.length).toBeGreaterThan(0);
    expect(RELEASES.map((r) => r.version)).not.toContain('Unreleased');
    expect(RELEASES.find((r) => r.version === '0.1.0')?.date).toBe('2026-09-24');
  });
});

describe('page tabs', () => {
  const file = (id: string) => ({ id, url: `https://a.com/${id}.js`, kind: 'Script' as const, originalHash: null, lite: false, dirty: false, saving: false });

  it('opens a page once, after the file tabs, and switches to it', () => {
    const tabs = useTabStore.getState();
    tabs.add(file('a'));
    tabs.openPage({ id: WHATS_NEW_TAB, page: 'whats-new', title: "What's New" });
    tabs.activate('a');
    tabs.openPage({ id: WHATS_NEW_TAB, page: 'whats-new', title: "What's New" });
    expect(useTabStore.getState().pages).toHaveLength(1);
    expect(useTabStore.getState().activeId).toBe(WHATS_NEW_TAB);
  });

  it('hands over to the neighbour in strip order when a page or file closes', () => {
    const tabs = useTabStore.getState();
    tabs.add(file('a'));
    tabs.add(file('b'));
    tabs.openPage({ id: WHATS_NEW_TAB, page: 'whats-new', title: "What's New" });
    useTabStore.getState().remove(WHATS_NEW_TAB);
    expect(useTabStore.getState().activeId).toBe('b');

    useTabStore.getState().openPage({ id: WHATS_NEW_TAB, page: 'whats-new', title: "What's New" });
    useTabStore.getState().activate('b');
    useTabStore.getState().remove('b');
    expect(useTabStore.getState().activeId).toBe(WHATS_NEW_TAB);
    expect(useTabStore.getState().tabs.map((t) => t.id)).toEqual(['a']);
  });
});
