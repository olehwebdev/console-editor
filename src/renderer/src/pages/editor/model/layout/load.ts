import { DEFAULTS, STORAGE_KEY } from './constants';
import { BOTTOM_VIEWS, type SavedLayout } from './types';

/** The remembered layout, or the defaults for what is missing or unreadable. */
export function load(): SavedLayout {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<SavedLayout>;
    const { sidebar, sidebarWidth, previewVisible, previewRatio, consoleVisible, consoleHeight, bottomView } = { ...DEFAULTS, ...saved };
    // A view this version doesn't have (saved by a later one) gives way to the default.
    const view = BOTTOM_VIEWS.includes(bottomView) ? bottomView : DEFAULTS.bottomView;
    return { sidebar, sidebarWidth, previewVisible, previewRatio, consoleVisible, consoleHeight, bottomView: view };
  } catch {
    return DEFAULTS;
  }
}
