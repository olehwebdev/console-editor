import { launchState } from './launchState';

/** Brings the window forward and opens `url` in it: a second launch's URL, or one macOS sends. */
export function handOver(url: string | undefined): void {
  const { running } = launchState;
  if (running && !running.win.isDestroyed()) {
    if (running.win.isMinimized()) running.win.restore();
    if (running.win.isVisible()) running.win.focus();
  }
  if (!url) return;
  if (launchState.started && running) void running.page.navigate(url);
  else launchState.handedUrl = url;
}
