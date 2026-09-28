import { APP_BROWSER_ID } from '@common/constants';
import type { Shot } from '@common/types';
import { browserLabel } from '@/entities/shot';

/** What a shot is called in a group: the browser it was taken in (the app's own page said so), or a design's name. */
export function shotLabel(shot: Shot): string {
  if (!shot.browser) return shot.name;
  return shot.browser.id === APP_BROWSER_ID ? `This app · ${browserLabel(shot.browser)}` : browserLabel(shot.browser);
}
