import { DMG_EXTENSION } from './constants';

/** What to do with a manual download, by its kind. */
export function manualInstallHint(file: string | undefined): string {
  if (file?.endsWith(DMG_EXTENSION)) return 'In the window that opened, drag Console Editor into Applications to replace this copy, then open it again.';
  return 'It is in your Downloads folder: unpack it over this copy, then open it again.';
}
