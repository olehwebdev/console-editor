import type { ShotBrowser } from '../../../shared/types';
import type { DrivenChromium } from './DrivenChromium';

/** A driven browser, as the browser a capture was taken in. */
export function shotBrowser(driven: DrivenChromium): ShotBrowser {
  const { id, name, version } = driven.list();
  return { id, name, version };
}
