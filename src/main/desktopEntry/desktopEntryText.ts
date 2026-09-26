import { LINUX_APP_NAME, LINUX_CATEGORY } from '../appInfo';
import { OWN_ENTRY_MARKER } from './constants';
import { escapeDesktopValue } from './escapeDesktopValue';
import { quoteExecArgument } from './quoteExecArgument';

/** Exec's field code for the URLs a launcher is handed: the app opens one given on its command line. */
const URLS_FIELD_CODE = '%U';

/** Characters no desktop entry value can hold as they are (a line break would end the key). */
// oxlint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

/**
 * The desktop entry that starts `launcher`, with the keys of the one the .deb installs: the icon and the
 * window class are the app's Linux name, so docks match its windows to it. Null for a path an entry can't
 * hold.
 */
export function desktopEntryText(launcher: string): string | null {
  if (CONTROL_CHARACTERS.test(launcher)) return null;
  return [
    '[Desktop Entry]',
    'Type=Application',
    'Name=Console Editor',
    'Comment=Live-patch the JavaScript, CSS and HTML of any website',
    `Exec=${escapeDesktopValue(`${quoteExecArgument(launcher)} ${URLS_FIELD_CODE}`)}`,
    // Desktops hide the entry once the file is gone (an AppImage deleted, or moved without being run again).
    `TryExec=${escapeDesktopValue(launcher)}`,
    `Icon=${LINUX_APP_NAME}`,
    `StartupWMClass=${LINUX_APP_NAME}`,
    'Terminal=false',
    `Categories=${LINUX_CATEGORY};`,
    OWN_ENTRY_MARKER,
    '',
  ].join('\n');
}
