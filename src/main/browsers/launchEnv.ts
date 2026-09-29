import { APPIMAGE_ENV } from './constants';

/** The environment a browser starts with: the app's own, less what an AppImage set for the app's libraries. */
export function launchEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  if (!env[APPIMAGE_ENV.marker]) return env;
  const clean = { ...env };
  for (const name of APPIMAGE_ENV.dropped) delete clean[name];
  return clean;
}
