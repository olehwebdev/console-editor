import { ACTIONS_WINDOW_HASH, GALLERY_HASH, PAGE_WINDOW_HASH } from '@common/constants';
import { EditorPage, pageCommands, pageSession } from '@/pages/editor';
import { ActionsWindowPage } from '@/pages/actions-window';
import { PageWindowPage } from '@/pages/page-window';
import { Gallery } from '../../gallery/Gallery';
import { startActionsWindowBridge } from '../actions-window-bridge';
import { startBridge } from '../bridge';
import { startPageWindowBridge } from '../page-window-bridge';
import type { AppView, AppViewSpec } from './types';

/** The view a window shows when its location hash names none. */
export const EDITOR_VIEW = 'editor' satisfies AppView;

/** Each view's page, link to the main process and floating UI, by the location hash that shows it. */
export const APP_VIEWS: Record<AppView, AppViewSpec> = {
  [EDITOR_VIEW]: {
    Root: EditorPage,
    start: () => startBridge(pageCommands, pageSession),
    overlays: true,
    // Past the rail and never wider than the room left of the website preview (the native page view hides whatever overlaps it).
    toastClassName: 'bottom-9 left-[calc(var(--rail-w)+12px)] max-w-[calc(100vw-var(--rail-w)-var(--preview-w)-24px)]',
  },
  // The gallery shows the design system alone: nothing to link to.
  [GALLERY_HASH]: { Root: Gallery, start: async () => () => undefined, overlays: true },
  [PAGE_WINDOW_HASH]: { Root: PageWindowPage, start: startPageWindowBridge, overlays: false },
  [ACTIONS_WINDOW_HASH]: { Root: ActionsWindowPage, start: startActionsWindowBridge, overlays: true },
};
