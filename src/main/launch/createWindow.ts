import { app } from 'electron';
import appIcon from '../../../build/icons/512x512.png?asset&asarUnpack';
import { encodeEvent } from '../../shared/appEventWire';
import { IPC_CHANNEL } from '../../shared/ipcChannels';
import type { AppEvent } from '../../shared/types';
import { REPO_URL } from '../appInfo';
import { ActionsWindow } from '../ActionsWindow';
import { BrowserRegistry, DrivenBrowsers } from '../browsers';
import { installMenu } from '../installMenu';
import { watchOverrideFiles } from '../overrideFiles';
import { registerIpc } from '../ipc';
import { PageController } from '../PageController';
import { PageShots, registerShotProtocol } from '../shots';
import { WorkspaceController } from '../WorkspaceController';
import { CloseGuard } from './CloseGuard';
import { createEditorWindow } from './createEditorWindow';
import { createUpdater } from './createUpdater';
import { activeBreakpoints } from './activeBreakpoints';
import { initialUrl } from './initialUrl';
import { launchState } from './launchState';
import { loadEditor } from './loadEditor';
import { lockEditorNavigation } from './lockEditorNavigation';
import { openStores } from './openStores';

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
  const { store, rules, settings, session, pageWindow, actionsWindow: actionsWindowStore, actions, sourceMaps, browsers: browserPrefs, shots: shotStore, hadData } = await openStores(userData);

  const win = createEditorWindow();

  const send = (event: AppEvent) => {
    if (!win.isDestroyed()) win.webContents.send(IPC_CHANNEL.onEvent, encodeEvent(event));
    // The Actions panel's own window, if it has one, shows what its panel needs; the website's, what its toolbar does.
    actionsWindow.forward(event);
    page.window.forward(event);
    // Browsers driven with the workspace's changes are served them as they change.
    driven.onAppEvent(event);
  };
  const actionsWindow = new ActionsWindow({ editor: win, store: actionsWindowStore, announce: (state) => send({ type: 'actions-window', state }) });

  // Told once the editor UI can show it.
  const { setAside, locked } = rules;
  const rulesProblem = locked ?? (setAside && `rules.json could not be read and was kept as ${setAside}; you start with no rules`);
  if (rulesProblem) win.webContents.once('did-finish-load', () => send({ type: 'error', message: rulesProblem }));

  const browsers = new BrowserRegistry({ prefs: browserPrefs, send });
  const driven = new DrivenBrowsers({ registry: browsers, sources: { store, rules, settings }, userData, send });
  const page = new PageController(win, { store, rules, settings, send, windowStore: pageWindow, breakpoints: () => activeBreakpoints(session) });
  launchState.running = { win, page };
  // Before the engine attaches: it serves the active workspace's overrides and rules from the start.
  // The design laid over the page goes over the tabs of browsers driven with the workspace's changes too.
  const shots = new PageShots({ store: shotStore, page, send, onDesign: (design) => void driven.setDesign(design) });
  registerShotProtocol(shotStore);
  const workspaces = new WorkspaceController(page, session, store, rules, actions, send, sourceMaps, shots);
  await workspaces.start();
  const attached = page.attach();
  installMenu(win, page, store, actionsWindow, send);
  // Edits saved in another editor (VS Code) are served as the app's own.
  const fileEdits = watchOverrideFiles(store, page, send);

  // Remember the page shown and its icon, so the next start (or switching back) reopens it.
  workspaces.watch(page.view.webContents);

  const closing = new CloseGuard(win, send);
  const updates = createUpdater({ updateFeed, userData, hadData, settings, send, closing });
  win.on('closed', () => {
    updates.dispose();
    fileEdits.stop();
    // The website's and the Actions panel's own windows go with the editor (and open again next time).
    page.window.dispose();
    actionsWindow.dispose();
    // Browsers driven with the workspace's changes stay open, as they are.
    driven.dispose();
  });
  registerIpc({ win, page, store, rules, settings, session, actions, sourceMaps, actionsWindow, workspaces, browsers, driven, shots, shotStore, updates, send, onSessionFlushed: (ok) => closing.flushed(ok) });

  lockEditorNavigation(win);

  win.once('ready-to-show', () => win.show());

  await loadEditor(win);

  await attached;
  // The website had a window of its own when the app last quit: it opens there again.
  if (pageWindow.get().detached) void page.window.detach();
  if (actionsWindowStore.get().detached) void actionsWindow.detach();
  const url = launchState.handedUrl ?? initialUrl() ?? session.get().url;
  launchState.started = true;
  if (url) void page.navigate(url);
  updates.schedule();
}
