import { FLATPAK_MARKERS, MAC_OPEN } from './constants';
import type { BrowserCommand } from '../types';
import { OPEN_COMMAND } from '../findBrowsers/mac/constants';

/**
 * A browser's command with `flags` and `url` added so the browser takes them: after `--args` for a macOS app (in a
 * new instance), before Flatpak's forwarded-file markers, else where the address goes.
 */
export function driveCommand({ command, urlAt }: BrowserCommand, flags: string[], url: string): string[] {
  if (command[0] === OPEN_COMMAND) return [command[0], MAC_OPEN.newInstance, ...command.slice(1), MAC_OPEN.args, ...flags, url];
  const marker = command.findIndex((arg) => FLATPAK_MARKERS.includes(arg));
  const at = marker >= 0 ? Math.min(marker, urlAt) : urlAt;
  return [...command.slice(0, at), ...flags, url, ...command.slice(at).filter((arg) => !FLATPAK_MARKERS.includes(arg))];
}
