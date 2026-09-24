import type { AvailableUpdate, UpdateState } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { useTabStore } from '@/entities/editor-tab';
import { useUpdateStore } from '@/entities/app-update';

export const WHATS_NEW_TAB = 'page:whats-new';
/** One toast for the update, replaced as it moves along. */
const TOAST_ID = 'app-update';

/** Opens (or switches to) the What's New page. */
export function openWhatsNew(): void {
  useTabStore.getState().openPage({ id: WHATS_NEW_TAB, page: 'whats-new', title: "What's New" });
}

export function openExternal(url: string): void {
  void api.openExternal(url).catch(() => undefined);
}

export function downloadUpdate(): void {
  void api.downloadUpdate().catch((err) => toast({ title: "Couldn't download the update", description: errorMessage(err), tone: 'danger' }));
}

/** Restarts into the update (auto), or shows the downloaded file again (manual). */
export function installUpdate(): void {
  void api.installUpdate().catch((err) => toast({ title: "Couldn't install the update", description: errorMessage(err), tone: 'danger' }));
}

/** The button that starts an update, by how it installs. */
export function downloadLabel(update: AvailableUpdate): string {
  return update.install === 'auto' ? 'Download and install' : 'Download';
}

/** How the offered update gets installed, in a sentence. */
export function availableHint(update: AvailableUpdate): string {
  if (update.install === 'manual') return 'Download it, then replace this copy.';
  return update.installsOnQuit
    ? 'It downloads in the background and installs when you restart or quit.'
    : 'It downloads in the background; restarting installs it, after asking for your password.';
}

/** What to do with a manual download, by its kind. */
export function manualInstallHint(file: string | undefined): string {
  if (file?.endsWith('.dmg')) return 'In the window that opened, drag Console Editor into Applications to replace this copy, then open it again.';
  return 'It is in your Downloads folder: unpack it over this copy, then open it again.';
}

/** Help › Check for Updates: checks now and says what came of it (an update found raises its own toast). */
export async function checkForUpdatesNow(): Promise<void> {
  announced = null;
  let state: UpdateState;
  try {
    state = await api.checkForUpdates();
  } catch (err) {
    toast({ id: TOAST_ID, title: "Couldn't check for updates", description: errorMessage(err), tone: 'danger' });
    return;
  }
  useUpdateStore.getState().setState(state);
  switch (state.status) {
    case 'disabled':
      toast({ id: TOAST_ID, title: 'Updates come to installed copies', description: 'This one runs from source: pull the latest changes instead.' });
      return;
    case 'up-to-date':
      toast({ id: TOAST_ID, title: "You're up to date", description: `Console Editor ${state.version} is the latest version.`, tone: 'success' });
      return;
    case 'error':
      toast({ id: TOAST_ID, title: "Couldn't check for updates", description: reason(state.message), tone: 'danger' });
      return;
    case 'available':
      announce(state.update);
      return;
    case 'ready':
      announceReady(state.update, state.file);
      return;
    case 'downloading':
      toast({
        id: TOAST_ID,
        title: `Downloading Console Editor ${state.update.version}…`,
        description: `${state.percent}% so far. The status bar shows its progress.`,
      });
      return;
    default:
      return;
  }
}

/** The updater's message without the "Couldn't …:" a toast has as its title. */
function reason(message: string): string {
  return message.replace(/^Couldn't [^:]+: /, '');
}

/** The version already announced this run: a periodic check finding it again stays quiet. */
let announced: string | null = null;

function announce(update: AvailableUpdate): void {
  announced = update.version;
  toast({
    id: TOAST_ID,
    title: `Console Editor ${update.version} is available`,
    description: availableHint(update),
    action: { label: downloadLabel(update), onClick: downloadUpdate },
    secondaryAction: { label: "What's new", onClick: openWhatsNew },
    duration: 0,
  });
}

function announceReady(update: AvailableUpdate, file: string | undefined): void {
  if (update.install === 'auto') {
    toast({
      id: TOAST_ID,
      title: `Console Editor ${update.version} is ready to install`,
      description: update.installsOnQuit
        ? 'Restart to finish, or quit. Unsaved edits are kept as drafts.'
        : 'Restart to install it (it asks for your password). Unsaved edits are kept as drafts.',
      tone: 'success',
      action: { label: 'Restart now', onClick: installUpdate },
      duration: 0,
    });
  } else {
    toast({
      id: TOAST_ID,
      title: `Console Editor ${update.version} downloaded`,
      description: manualInstallHint(file),
      tone: 'success',
      action: { label: file?.endsWith('.dmg') ? 'Open again' : 'Show file', onClick: installUpdate },
      duration: 0,
    });
  }
}

/** Keeps the store in step with the main process, and tells the user what they need to know. */
export function handleUpdateState(state: UpdateState): void {
  const prev = useUpdateStore.getState().state;
  useUpdateStore.getState().setState(state);
  switch (state.status) {
    case 'available':
      if (announced !== state.update.version) announce(state.update);
      return;
    case 'downloading':
      // Progress shows in the status bar and on the What's New page.
      if (prev.status !== 'downloading') toast.dismiss(TOAST_ID);
      return;
    case 'ready':
      if (prev.status === 'downloading') announceReady(state.update, state.file);
      return;
    case 'error':
      // A failed download, or an install that didn't happen (e.g. the password was refused). A failed check
      // is reported by the Check for Updates command that asked for it, or not at all.
      if (state.update && state.during !== 'check' && prev.status !== 'error') {
        toast({
          id: TOAST_ID,
          title: state.during === 'install' ? "Couldn't install the update" : "Couldn't download the update",
          description: reason(state.message),
          tone: 'danger',
          action: { label: 'Try again', onClick: downloadUpdate },
          duration: 0,
        });
      }
      return;
    default:
      return;
  }
}

/** Loads the updater's state, and opens What's New right after an update. */
export async function startUpdates(): Promise<void> {
  const [info, state] = await Promise.all([api.getAppInfo(), api.getUpdateState()]);
  useUpdateStore.getState().setInfo(info);
  handleUpdateState(state);
  if (info.updatedFrom) openWhatsNew();
}
