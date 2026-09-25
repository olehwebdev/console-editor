import { app } from 'electron';
import appIcon from '../../../build/icons/512x512.png?asset&asarUnpack';
import { IPC_CHANNEL } from '../../shared/ipcChannels';
import type { AppEvent } from '../../shared/types';
import { REPO_URL } from '../appInfo';
import { installMenu } from '../installMenu';
import { registerIpc } from '../ipc';
import { PageController } from '../PageController';
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
  const { store, rules, settings, session, pageWindow, actions, hadData } = await openStores(userData);

  const win = createEditorWindow();

  const send = (event: AppEvent) => {
    if (!win.isDestroyed()) win.webContents.send(IPC_CHANNEL.onEvent, event);
  };

  // Told once the editor UI can show it.
  const { setAside, locked } = rules;
  const rulesProblem = locked ?? (setAside && `rules.json could not be read and was kept as ${setAside}; you start with no rules`);
  if (rulesProblem) win.webContents.once('did-finish-load', () => send({ type: 'error', message: rulesProblem }));

  const page = new PageController(win, { store, rules, settings, send, windowStore: pageWindow, breakpoints: () => activeBreakpoints(session) });
  launchState.running = { win, page };
  // Before the engine attaches: it serves the active workspace's overrides and rules from the start.
  const workspaces = new WorkspaceController(page, session, store, rules, actions, send);
  await workspaces.start();
  const attached = page.attach();
  installMenu(win, page, store, send);

  // Remember the page shown and its icon, so the next start (or switching back) reopens it.
  workspaces.watch(page.view.webContents);

  const closing = new CloseGuard(win, send);
  const updates = createUpdater({ updateFeed, userData, hadData, settings, send, closing });
  win.on('closed', () => {
    updates.dispose();
    // The website's own window goes with the editor (and opens again next time).
    page.window.dispose();
  });
  registerIpc({ win, page, store, rules, settings, session, actions, workspaces, updates, send, onSessionFlushed: (ok) => closing.flushed(ok) });

  lockEditorNavigation(win);

  win.once('ready-to-show', () => win.show());

  await loadEditor(win);

  await attached;
  // The website had a window of its own when the app last quit: it opens there again.
  if (pageWindow.get().detached) void page.window.detach();
  const url = launchState.handedUrl ?? initialUrl() ?? session.get().url;
  launchState.started = true;
  if (url) void page.navigate(url);
  updates.schedule();
}
