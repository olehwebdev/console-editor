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

/** Human labels for each setting, in display order. */
export const SETTING_META: Array<{ key: keyof Settings; label: string; help: string }> = [
  { key: 'autoReloadOnSave', label: 'Reload page on save', help: 'Reload the page after saving, enabling or deleting an override.' },
  { key: 'autoFormatMinified', label: 'Pretty-print minified files', help: 'Format minified JS/CSS/HTML when you open them.' },
  { key: 'stripIntegrity', label: 'Strip integrity checks (SRI)', help: 'Otherwise the browser refuses edited files loaded with integrity="…".' },
  { key: 'stripSourceMaps', label: 'Strip source maps from overrides', help: 'Edited files no longer line up with their source maps.' },
  { key: 'disableCache', label: 'Disable HTTP cache', help: 'Every load goes to the network, so overrides always apply.' },
  { key: 'bypassServiceWorker', label: 'Bypass service workers', help: 'Service workers can answer from their cache and skip overrides.' },
  { key: 'bypassCSP', label: 'Bypass Content-Security-Policy', help: 'Allow eval/inline code in patches on sites with a strict CSP.' },
];
