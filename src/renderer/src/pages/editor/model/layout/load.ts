import { DEFAULTS, STORAGE_KEY } from './constants';
import type { SavedLayout } from './types';

/** The remembered layout, or the defaults for what is missing or unreadable. */
export function load(): SavedLayout {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<SavedLayout>;
    const { sidebar, sidebarWidth, previewVisible, previewRatio } = { ...DEFAULTS, ...saved };
    return { sidebar, sidebarWidth, previewVisible, previewRatio };
  } catch {
    return DEFAULTS;
  }
}
