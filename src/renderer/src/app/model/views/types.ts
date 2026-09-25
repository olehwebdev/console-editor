import type { ComponentType } from 'react';
import type { ACTIONS_WINDOW_HASH, GALLERY_HASH, PAGE_WINDOW_HASH } from '@common/constants';

/** What a window of the app shows: the editor, the website's own window, the Actions panel's, or the design-system gallery. */
export type AppView = 'editor' | typeof GALLERY_HASH | typeof PAGE_WINDOW_HASH | typeof ACTIONS_WINDOW_HASH;

export interface AppViewSpec {
  /** The page it shows. */
  Root: ComponentType;
  /** Starts its link to the main process; resolves with what stops it. */
  start(): Promise<() => void>;
  /** It has the editor's floating UI: the toast stack and the confirm dialog. */
  overlays: boolean;
  /** Where its toast stack sits (classes), when not in the default bottom-left corner. */
  toastClassName?: string;
}
