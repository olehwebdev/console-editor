import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ACTIONS_WINDOW_EVENTS } from '../../src/shared/constants';
import { DEFAULT_SETTINGS, type ConsoleAction, type ConsoleFrame } from '../../src/shared/types';
import { handleActionsWindowEvent, startActionsWindowBridge } from '@/app/model/actions-window-bridge';
import { handleAppEvent } from '@/app/model/bridge';
import { useActionStore } from '@/entities/action';
import { useFrameStore } from '@/entities/frame';
import { useSettingsStore } from '@/entities/settings';
import { useWorkspaceStore } from '@/entities/workspace';

const api = vi.hoisted(() => ({
  getSettings: vi.fn(),
  getWorkspaces: vi.fn(),
  listFrames: vi.fn(),
  listActions: vi.fn(),
  getActionsWindow: vi.fn(),
}));
const events = vi.hoisted(() => ({ listener: undefined as ((event: unknown) => void) | undefined, off: vi.fn() }));
vi.mock('@/shared/api', () => ({
  api,
  onAppEvent: (listener: (event: unknown) => void) => {
    events.listener = listener;
    return events.off;
  },
  errorMessage: (err: unknown) => String(err),
}));
vi.mock('@/shared/ui/toast', () => ({ toast: Object.assign(vi.fn(), { dismiss: vi.fn(), update: vi.fn() }) }));
vi.mock('@/shared/ui/dialog', () => ({ confirm: async () => true, isConfirmOpen: () => false }));
vi.mock('@/shared/monaco', () => ({ monaco: {}, languageFor: () => 'javascript', editorHasFocus: () => false, dismissEditorWidgets: () => {}, triggerInActiveEditor: () => {} }));

const ACTION: ConsoleAction = { id: 'a1', name: 'Add A1', target: 'top', targetName: '', code: "addItem('A1')", createdAt: 1, updatedAt: 1 };
const FRAME: ConsoleFrame = { id: 'T', url: 'https://shop.test/', name: '', canRun: true };
const WORKSPACES = { activeId: 'w1', workspaces: [{ id: 'w1', name: '', host: 'shop.test', title: '', icon: 'favicon' as const, color: 'ember' as const, frameNames: {} }] };

beforeEach(() => {
  vi.clearAllMocks();
  useActionStore.setState({ actions: [], window: { detached: false, onTop: false } });
  useFrameStore.setState({ frames: [], seen: {} });
  useSettingsStore.getState().setSettings(DEFAULT_SETTINGS);
});

describe('the Actions window', () => {
  it('loads what its panel shows, then follows the events it is sent', async () => {
    api.getSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, captureConsole: false });
    api.getWorkspaces.mockResolvedValue(WORKSPACES);
    api.listFrames.mockResolvedValue([FRAME]);
    api.listActions.mockResolvedValue([ACTION]);
    api.getActionsWindow.mockResolvedValue({ detached: true, onTop: false });
    const stop = await startActionsWindowBridge();
    expect(useActionStore.getState()).toMatchObject({ actions: [ACTION], window: { detached: true, onTop: false } });
    expect(useFrameStore.getState().frames).toEqual([FRAME]);
    expect(useSettingsStore.getState().settings.captureConsole).toBe(false);
    expect(useWorkspaceStore.getState().activeId).toBe('w1');

    events.listener!({ type: 'actions-window', state: { detached: true, onTop: true } });
    events.listener!({ type: 'settings-changed', settings: DEFAULT_SETTINGS });
    events.listener!({ type: 'actions-changed', actions: [] });
    expect(useActionStore.getState()).toMatchObject({ actions: [], window: { onTop: true } });
    expect(useSettingsStore.getState().settings.captureConsole).toBe(true);
    stop();
    expect(events.off).toHaveBeenCalled();
  });

  it("ignores the editor's own events", () => {
    handleActionsWindowEvent({ type: 'console-entries', entries: [] });
    handleActionsWindowEvent({ type: 'flush-session' });
    expect(ACTIONS_WINDOW_EVENTS).not.toContain('flush-session');
    expect(useActionStore.getState().actions).toEqual([]);
  });

  it("keeps the editor's copy of where the panel is, and of the settings another window changed", () => {
    handleAppEvent({ type: 'actions-window', state: { detached: true, onTop: true } });
    expect(useActionStore.getState().window).toEqual({ detached: true, onTop: true });
    handleAppEvent({ type: 'settings-changed', settings: { ...DEFAULT_SETTINGS, captureConsole: false } });
    expect(useSettingsStore.getState().settings.captureConsole).toBe(false);
  });
});
