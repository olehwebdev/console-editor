import { app, BrowserWindow, dialog } from 'electron';
import { join } from 'node:path';
import type { AppEvent } from '../shared/types';
import { LOCAL_NETWORK_ACCESS_FEATURES, withDisabledFeatures } from './chromiumFlags';
import { registerIpc } from './ipc';
import { installMenu } from './menu';
import { PageController } from './PageController';
import { OverrideStore } from './store/OverrideStore';
import { SessionStore } from './store/SessionStore';
import { SettingsStore } from './store/SettingsStore';

// Allow tests and power users to keep data elsewhere (e.g. a throwaway profile).
if (process.env.CONSOLE_EDITOR_USER_DATA) app.setPath('userData', process.env.CONSOLE_EDITOR_USER_DATA);

// Documents served from overrides would otherwise lose access to local/intranet hosts (see chromiumFlags.ts).
app.commandLine.appendSwitch(
  'disable-features',
  withDisabledFeatures(app.commandLine.getSwitchValue('disable-features'), LOCAL_NETWORK_ACCESS_FEATURES),
);

/** First http(s) URL on the command line, e.g. `npm start -- https://example.com`. */
function initialUrl(): string | undefined {
  return process.argv.slice(1).find((arg) => /^https?:\/\//i.test(arg)) ?? process.env.CONSOLE_EDITOR_URL;
}

async function createWindow(): Promise<void> {
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

app.whenReady().then(createWindow, (err) => {
  console.error(err);
  app.exit(1);
});

app.on('window-all-closed', () => app.quit());
