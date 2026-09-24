import { app, BrowserWindow, dialog } from 'electron';
import { join } from 'node:path';
import appIcon from '../../build/icons/512x512.png?asset&asarUnpack';
import type { AppEvent } from '../shared/types';
import { APP_ID, REPO_URL } from './appInfo';
import { LOCAL_NETWORK_ACCESS_FEATURES, withDisabledFeatures } from './chromiumFlags';
import { registerIpc } from './ipc';
import { installMenu } from './menu';
import { PageController } from './PageController';
import { OverrideStore } from './store/OverrideStore';
import { SessionStore } from './store/SessionStore';
import { SettingsStore } from './store/SettingsStore';

// Allow tests and power users to keep data elsewhere (e.g. a throwaway profile).
if (process.env.CONSOLE_EDITOR_USER_DATA) app.setPath('userData', process.env.CONSOLE_EDITOR_USER_DATA);

// As Chrome does, open no debugging port onto the real profile: any local program could start the app
// with one and read the site view's logins. With a data folder of its own (tests) it still works.
if (app.isPackaged && !process.env.CONSOLE_EDITOR_USER_DATA) {
  app.commandLine.removeSwitch('remote-debugging-port');
  app.commandLine.removeSwitch('remote-debugging-pipe');
}

// Documents served from overrides would otherwise lose access to local/intranet hosts (see chromiumFlags.ts).
app.commandLine.appendSwitch(
  'disable-features',
  withDisabledFeatures(app.commandLine.getSwitchValue('disable-features'), LOCAL_NETWORK_ACCESS_FEATURES),
);

// Windows ties notifications and taskbar grouping to this id; the installer's shortcuts carry the same one.
if (process.platform === 'win32') app.setAppUserModelId(APP_ID);

/** First http(s) URL among command-line arguments, e.g. `npm start -- https://example.com`. */
const urlArgument = (args: string[]) => args.find((arg) => /^https?:\/\//i.test(arg));

const initialUrl = () => urlArgument(process.argv.slice(1)) ?? process.env.CONSOLE_EDITOR_URL;

/** The open window, for a second launch to hand over to. */
let running: { win: BrowserWindow; page: PageController } | undefined;

async function createWindow(): Promise<void> {
  app.setAboutPanelOptions({
    applicationName: 'Console Editor',
    applicationVersion: app.getVersion(),
    copyright: '© 2026 olehwebdev · MIT License',
    website: REPO_URL,
    iconPath: appIcon,
  });
  const userData = app.getPath('userData');
  const store = new OverrideStore(join(userData, 'workspace'));
  const settings = new SettingsStore(join(userData, 'settings.json'));
  const session = new SessionStore(join(userData, 'session'));
  await Promise.all([store.load(), settings.load(), session.load()]);

  const win = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 960,
    minHeight: 600,
    title: 'Console Editor',
    // Elsewhere the window takes the app's own icon; on Linux it has to be given one.
    ...(process.platform === 'linux' ? { icon: appIcon } : {}),
    // Matches the --canvas token, so nothing flashes before the UI paints.
    backgroundColor: '#08080a',
    // The app menu keeps its shortcuts; on Windows/Linux Alt shows the bar.
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
    },
  });

  const send = (event: AppEvent) => {
    if (!win.isDestroyed()) win.webContents.send('app:event', event);
  };

  const page = new PageController(win, store, settings, send);
  running = { win, page };
  const attached = page.attach();
  installMenu(win, page, store, send);

  // Remember the page shown, so the next start reopens it.
  const rememberUrl = (url: string) => void session.setUrl(url).catch(() => undefined);
  page.view.webContents.on('did-navigate', (_event, url) => rememberUrl(url));
  page.view.webContents.on('did-navigate-in-page', (_event, url, isMainFrame) => isMainFrame && rememberUrl(url));

  // Closing keeps unsaved edits as drafts (reopened next time) instead of asking to discard them:
  // the renderer writes what it hasn't yet, then answers.
  // (The design-system gallery has no drafts to keep.)
  let closeReady = !!process.env.CONSOLE_EDITOR_GALLERY;
  let flushTimer: NodeJS.Timeout | undefined;
  const finishClose = (ok: boolean) => {
    if (!flushTimer) return;
    clearTimeout(flushTimer);
    flushTimer = undefined;
    if (!ok) {
      const choice = dialog.showMessageBoxSync(win, {
        type: 'warning',
        buttons: ['Close anyway', 'Cancel'],
        defaultId: 1,
        cancelId: 1,
        message: 'Your unsaved edits could not be kept.',
        detail: 'Close anyway and lose them?',
      });
      if (choice !== 0) return;
    }
    closeReady = true;
    win.close();
  };
  win.on('close', (event) => {
    if (closeReady) return;
    event.preventDefault();
    if (flushTimer) return;
    send({ type: 'flush-session' });
    flushTimer = setTimeout(() => finishClose(false), 5000);
  });
  registerIpc({ win, page, store, settings, session, onSessionFlushed: finishClose });

  // The editor UI must never navigate away or open windows.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => event.preventDefault());

  win.once('ready-to-show', () => win.show());

  // CONSOLE_EDITOR_GALLERY=1 opens the design-system gallery instead of the editor.
  const hash = process.env.CONSOLE_EDITOR_GALLERY ? 'gallery' : undefined;
  if (process.env.ELECTRON_RENDERER_URL) {
    await win.loadURL(`${process.env.ELECTRON_RENDERER_URL}${hash ? `#${hash}` : ''}`);
  } else {
    await win.loadFile(join(__dirname, '../renderer/index.html'), { hash });
  }

  await attached;
  const url = initialUrl() ?? session.get().url;
  if (url) void page.navigate(url);
}

// One instance per data folder: two would overwrite each other's overrides and session.
// Launching again brings this window forward instead, opening the URL it was given, if any.
if (!app.requestSingleInstanceLock()) {
  console.log(`Console Editor is already running with the data folder ${app.getPath('userData')}; switching to it.`);
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    if (!running || running.win.isDestroyed()) return;
    const { win, page } = running;
    if (win.isMinimized()) win.restore();
    if (win.isVisible()) win.focus();
    const url = urlArgument(argv.slice(1));
    if (url) void page.navigate(url);
  });
  app.whenReady().then(createWindow, (err) => {
    console.error(err);
    app.exit(1);
  });
}

app.on('window-all-closed', () => app.quit());
