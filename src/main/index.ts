import { app } from 'electron';
import { resolve } from 'node:path';
import { ENV } from '../shared/constants';
import { APP_ID } from './appInfo';
import { LOCAL_NETWORK_ACCESS_FEATURES, withDisabledFeatures } from './chromiumFlags';
import { HTTP_URL } from './constants';
import { createWindow } from './launch/createWindow';
import { handOver } from './launch/handOver';
import { sameFolder } from './launch/sameFolder';
import { urlArgument } from './launch/urlArgument';

/** Chromium command-line switches the app sets or removes. */
const CHROMIUM_SWITCH = {
  disableFeatures: 'disable-features',
  remoteDebuggingPort: 'remote-debugging-port',
  remoteDebuggingPipe: 'remote-debugging-pipe',
} as const;

/** Added to the data folder's name for runs from source. */
const DEV_DATA_SUFFIX = ' (dev)';

// Runs from source (npm run dev, npm start) keep their data apart from an installed copy's, so the two can
// run side by side and a dev build never touches your real overrides and logins.
if (!app.isPackaged) app.setPath('userData', `${app.getPath('userData')}${DEV_DATA_SUFFIX}`);
const defaultUserData = app.getPath('userData');

// Allow tests and power users to keep data elsewhere (e.g. a throwaway profile).
const userDataOverride = process.env[ENV.userData];
if (userDataOverride) app.setPath('userData', resolve(userDataOverride));

/** Tests run with a data folder of their own; so may power users. */
const ownDataFolder = !sameFolder(app.getPath('userData'), defaultUserData);

// As Chrome does, open no debugging port onto the real profile: any local program could start the app
// with one and read the site view's logins. With a data folder of its own (tests) it still works.
if (app.isPackaged && !ownDataFolder) {
  app.commandLine.removeSwitch(CHROMIUM_SWITCH.remoteDebuggingPort);
  app.commandLine.removeSwitch(CHROMIUM_SWITCH.remoteDebuggingPipe);
}

/** A local update server standing in for GitHub (tests); likewise never for the real profile. */
const updateFeed = ownDataFolder ? process.env[ENV.updateFeed]?.replace(/\/+$/, '') || undefined : undefined;

// Documents served from overrides would otherwise lose access to local/intranet hosts (see chromiumFlags/).
app.commandLine.appendSwitch(
  CHROMIUM_SWITCH.disableFeatures,
  withDisabledFeatures(app.commandLine.getSwitchValue(CHROMIUM_SWITCH.disableFeatures), LOCAL_NETWORK_ACCESS_FEATURES),
);

// Windows ties notifications and taskbar grouping to this id; the installer's shortcuts carry the same one.
if (process.platform === 'win32') app.setAppUserModelId(APP_ID);

// One instance per data folder: two would overwrite each other's overrides and session.
// Launching again brings this window forward instead, opening the URL it was given, if any.
if (!app.requestSingleInstanceLock()) {
  console.log(`Console Editor is already running with the data folder ${app.getPath('userData')}; switching to it.`);
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => handOver(urlArgument(argv.slice(1))));
  // macOS starts no second process when the app is opened again (Finder, `open -a`): it sends the URL here.
  app.on('open-url', (event, url) => {
    if (!HTTP_URL.test(url)) return;
    event.preventDefault();
    handOver(url);
  });
  app.whenReady().then(() => createWindow(updateFeed), (err) => {
    console.error(err);
    app.exit(1);
  });
}

app.on('window-all-closed', () => app.quit());
