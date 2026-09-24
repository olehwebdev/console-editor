import { create } from 'zustand';
import { DEFAULT_SETTINGS, type Settings } from '@common/types';

interface SettingsStore {
  settings: Settings;
  setSettings(settings: Settings): void;
}

export const useSettingsStore = create<SettingsStore>()((set) => ({
  settings: DEFAULT_SETTINGS,
  setSettings: (settings) => set({ settings }),
}));
