import { THROTTLING_PRESETS, type Settings } from '../../shared/types';
import { isSwitch } from './isSwitch';

/** What each setting may hold: a new setting fails typecheck until it has a check. */
export const SETTING_CHECKS: { [K in keyof Settings]: (value: unknown) => boolean } = {
  autoReloadOnSave: isSwitch,
  stripIntegrity: isSwitch,
  stripSourceMaps: isSwitch,
  bypassServiceWorker: isSwitch,
  disableCache: isSwitch,
  bypassCSP: isSwitch,
  autoFormatMinified: isSwitch,
  checkForUpdates: isSwitch,
  captureConsole: isSwitch,
  frameworkHooks: isSwitch,
  throttling: (value) => THROTTLING_PRESETS.includes(value as never),
};
