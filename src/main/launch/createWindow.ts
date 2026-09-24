import { app, BrowserWindow, dialog, net, shell } from 'electron';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import appIcon from '../../../build/icons/512x512.png?asset&asarUnpack';
import { ENV, GALLERY_HASH } from '../../shared/constants';
import { IPC_CHANNEL } from '../../shared/ipcChannels';
import type { AppEvent } from '../../shared/types';
import { REPO_URL } from '../appInfo';
import { installMenu } from '../installMenu';
import { registerIpc } from '../ipc';
import { PageController } from '../PageController';
import { OverrideStore } from '../store/OverrideStore';
import { SessionStore } from '../store/SessionStore';
import { SettingsStore } from '../store/SettingsStore';
import { detectInstallMethod, electronAutoInstaller } from '../update/electronInstaller';
import { updateEndpoints } from '../update/updateEndpoints';
import { UpdateService } from '../update/UpdateService';
import { initialUrl } from './initialUrl';
import { launchState } from './launchState';

/** What the app keeps in its data folder. */
const USER_DATA = {
  settings: 'settings.json',
  session: 'session',
  workspace: 'workspace',
  /** The last version run. */
  updateRecord: 'update.json',
  /** Updates downloaded from a local update server (tests). */
  downloads: 'downloads',
} as const;

/** Data without update.json is 0.1.0's, which kept no record of its version. */
const UNRECORDED_VERSION = '0.1.0';

/** The window's size when it first opens, and the smallest it can be made. */
const WINDOW_SIZE = { width: 1600, height: 1000 };
const MIN_WINDOW_SIZE = { width: 960, height: 600 };

/** Matches the --canvas token, so nothing flashes before the UI paints. */
const CANVAS_COLOR = '#08080a';

/** Where electron-vite puts the preload script and the editor UI, relative to the main bundle. */
const PRELOAD_SCRIPT = '../preload/index.js';
const EDITOR_PAGE = '../renderer/index.html';

/** How long closing waits for the renderer to write its drafts. */
const FLUSH_TIMEOUT_MS = 5000;

/** The "unsaved edits could not be kept" dialog's buttons, by index. */
const FLUSH_FAILED_BUTTON = { closeAnyway: 0, cancel: 1 } as const;

/** A macOS disk image. */
const DISK_IMAGE_EXTENSION = '.dmg';

/** `CONSOLE_EDITOR_GALLERY=1` opens the design-system gallery instead of the editor. */
const galleryMode = !!process.env[ENV.gallery];

/**
 * Opens the editor window with its stores, menu, IPC and updater, then the first page.
 * `updateFeed`: a local update server standing in for GitHub (tests).
 */
export async function createWindow(updateFeed: string | undefined): Promise<void> {
  app.setAboutPanelOptions({
    applicationName: 'Console Editor',
    applicationVersion: app.getVersion(),
    copyright: '© 2026 olehwebdev · MIT License',
    website: REPO_URL,
    iconPath: appIcon,
  });
  const userData = app.getPath('userData');
  // Looked at before the stores create their folders.
  const hadData = [USER_DATA.settings, USER_DATA.session, USER_DATA.workspace].some((name) => existsSync(join(userData, name)));
  const store = new OverrideStore(join(userData, USER_DATA.workspace));
  const settings = new SettingsStore(join(userData, USER_DATA.settings));
  const session = new SessionStore(join(userData, USER_DATA.session));
  await Promise.all([store.load(), settings.load(), session.load()]);

  const win = new BrowserWindow({
    width: WINDOW_SIZE.width,
    height: WINDOW_SIZE.height,
    minWidth: MIN_WINDOW_SIZE.width,
    minHeight: MIN_WINDOW_SIZE.height,
    title: 'Console Editor',
    // Elsewhere the window takes the app's own icon; on Linux it has to be given one.
    ...(process.platform === 'linux' ? { icon: appIcon } : {}),
    backgroundColor: CANVAS_COLOR,
    // The app menu keeps its shortcuts; on Windows/Linux Alt shows the bar.
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, PRELOAD_SCRIPT),
      contextIsolation: true,
      sandbox: true,
    },
  });

  const send = (event: AppEvent) => {
    if (!win.isDestroyed()) win.webContents.send(IPC_CHANNEL.onEvent, event);
  };

  const page = new PageController(win, store, settings, send);
  launchState.running = { win, page };
  const attached = page.attach();
  installMenu(win, page, store, send);

  // Remember the page shown, so the next start reopens it.
  const rememberUrl = (url: string) => void session.setUrl(url).catch(() => undefined);
  page.view.webContents.on('did-navigate', (_event, url) => rememberUrl(url));
  page.view.webContents.on('did-navigate-in-page', (_event, url, isMainFrame) => isMainFrame && rememberUrl(url));

  // Closing keeps unsaved edits as drafts (reopened next time) instead of asking to discard them:
  // the renderer writes what it hasn't yet, then answers. Installing an update does the same first.
  // (The design-system gallery has no drafts to keep.)
  let closeReady = galleryMode;
  let flushing: Promise<boolean> | undefined;
  let answerFlush: ((ok: boolean) => void) | undefined;
  /** True once drafts are written, or the user accepts losing them. */
  const prepareToQuit = (): Promise<boolean> => {
    if (closeReady) return Promise.resolve(true);
    flushing ??= new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => answerFlush?.(false), FLUSH_TIMEOUT_MS);
      answerFlush = (ok) => {
        clearTimeout(timer);
        answerFlush = undefined;
        resolve(ok);
      };
      send({ type: 'flush-session' });
    }).then((ok) => {
      flushing = undefined;
      if (!ok && !win.isDestroyed()) {
        const choice = dialog.showMessageBoxSync(win, {
          type: 'warning',
          buttons: ['Close anyway', 'Cancel'],
          defaultId: FLUSH_FAILED_BUTTON.cancel,
          cancelId: FLUSH_FAILED_BUTTON.cancel,
          message: 'Your unsaved edits could not be kept.',
          detail: 'Close anyway and lose them?',
        });
        if (choice !== FLUSH_FAILED_BUTTON.closeAnyway) return false;
      }
      closeReady = true;
      return true;
    });
    return flushing;
  };
  win.on('close', (event) => {
    if (closeReady) return;
    event.preventDefault();
    void prepareToQuit().then((ok) => {
      if (ok && !win.isDestroyed()) win.close();
    });
  });

  const updates = new UpdateService({
    currentVersion: app.getVersion(),
    platform: process.platform,
    // An Intel build running under Rosetta updates to the Apple silicon one.
    arch: process.arch === 'arm64' || app.runningUnderARM64Translation ? 'arm64' : 'x64',
    enabled: app.isPackaged || !!updateFeed,
    endpoints: updateEndpoints(updateFeed),
    fetch: (url, init) => net.fetch(url, init),
    autoInstaller: async () => {
      const method = await detectInstallMethod();
      return method ? electronAutoInstaller(method, updateFeed) : null;
    },
    downloadsDir: updateFeed ? join(userData, USER_DATA.downloads) : app.getPath('downloads'),
    stateFile: join(userData, USER_DATA.updateRecord),
    unrecordedVersion: hadData ? UNRECORDED_VERSION : null,
    autoCheck: () => settings.get().checkForUpdates,
    send: (state) => send({ type: 'update', state }),
    prepareToQuit,
    cancelQuit: () => {
      closeReady = galleryMode;
    },
    // A disk image opens (mounted, in Finder); anything else is shown in its folder.
    showFile: async (file) => {
      if (file.endsWith(DISK_IMAGE_EXTENSION)) await shell.openPath(file);
      else shell.showItemInFolder(file);
    },
  });
  win.on('closed', () => updates.dispose());
  registerIpc({ win, page, store, settings, session, updates, onSessionFlushed: (ok) => answerFlush?.(ok) });

  // The editor UI must never navigate away or open windows.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => event.preventDefault());

  win.once('ready-to-show', () => win.show());

  const hash = galleryMode ? GALLERY_HASH : undefined;
  const rendererUrl = process.env[ENV.rendererUrl];
  if (rendererUrl) {
    await win.loadURL(`${rendererUrl}${hash ? `#${hash}` : ''}`);
  } else {
    await win.loadFile(join(__dirname, EDITOR_PAGE), { hash });
  }

  await attached;
  const url = launchState.handedUrl ?? initialUrl() ?? session.get().url;
  launchState.started = true;
  if (url) void page.navigate(url);
  updates.schedule();
}
