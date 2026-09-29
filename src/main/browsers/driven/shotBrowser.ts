import type { ShotBrowser } from '../../../shared/types';
import type { Driver } from './types';

/** A driven browser, as the browser a capture was taken in. */
export function shotBrowser(driver: Driver): ShotBrowser {
  const { browserId, name, version } = driver.list();
  return { id: browserId, name, version };
}
