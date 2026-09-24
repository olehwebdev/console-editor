import { app, BrowserWindow, dialog } from 'electron';
import { join } from 'node:path';
import type { AppEvent } from '../shared/types';
import { LOCAL_NETWORK_ACCESS_FEATURES, withDisabledFeatures } from './chromiumFlags';
import { registerIpc } from './ipc';
import { installMenu } from './menu';
import { PageController } from './PageController';
import { OverrideStore } from './store/OverrideStore';
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
  await Promise.all([store.load(), settings.load()]);

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
  registerIpc({ win, page, store, settings });
  installMenu(win, page, store, send);

  // The editor UI must never navigate away or open windows.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => event.preventDefault());

  // The renderer blocks unload while there are unsaved edits; ask before discarding them.
  win.webContents.on('will-prevent-unload', (event) => {
    const choice = dialog.showMessageBoxSync(win, {
      type: 'question',
      buttons: ['Discard changes', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      message: 'You have unsaved edits.',
      detail: 'Close anyway and lose them?',
    });
    if (choice === 0) event.preventDefault();
  });

  win.once('ready-to-show', () => win.show());

  // CONSOLE_EDITOR_GALLERY=1 opens the design-system gallery instead of the editor.
  const hash = process.env.CONSOLE_EDITOR_GALLERY ? 'gallery' : undefined;
  if (process.env.ELECTRON_RENDERER_URL) {
    await win.loadURL(`${process.env.ELECTRON_RENDERER_URL}${hash ? `#${hash}` : ''}`);
  } else {
    await win.loadFile(join(__dirname, '../renderer/index.html'), { hash });
  }

  await attached;
  const url = initialUrl();
  if (url) void page.navigate(url);
}

app.whenReady().then(createWindow, (err) => {
  console.error(err);
  app.exit(1);
});

app.on('window-all-closed', () => app.quit());
