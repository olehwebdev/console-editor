import { GALLERY_HASH, PAGE_WINDOW_HASH } from '@common/constants';
import { EditorPage, pageCommands, pageSession } from '@/pages/editor';
import { PageWindowPage } from '@/pages/page-window';
import { Gallery } from '../../gallery/Gallery';
import { startBridge } from '../bridge';
import { startPageWindowBridge } from '../page-window-bridge';
import type { AppView, AppViewSpec } from './types';

/** The view a window shows when its location hash names none. */
export const EDITOR_VIEW = 'editor' satisfies AppView;

/** Each view's page, link to the main process and floating UI, by the location hash that shows it. */
export const APP_VIEWS: Record<AppView, AppViewSpec> = {
  [EDITOR_VIEW]: { Root: EditorPage, start: () => startBridge(pageCommands, pageSession), overlays: true },
  // The gallery shows the design system alone: nothing to link to.
  [GALLERY_HASH]: { Root: Gallery, start: async () => () => undefined, overlays: true },
  [PAGE_WINDOW_HASH]: { Root: PageWindowPage, start: startPageWindowBridge, overlays: false },
};
