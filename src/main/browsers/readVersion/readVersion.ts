import { basename, join } from 'node:path';
import { VERSION_FLAG, VERSION_NUMBER, VERSION_TIMEOUT_MS } from '../constants';
import { runProgram } from '../runProgram';
import type { FoundBrowser } from '../types';
import { FLATPAK, PLUTIL, POWERSHELL } from './constants';

/**
 * A browser's version, the system's way: its app's Info.plist (macOS), its program's file version (Windows), else
 * what the program answers to `--version` (Chromium, Firefox and GNOME Web do, without opening a window). Null when
 * none is found in time.
 */
export async function readVersion(browser: FoundBrowser): Promise<string | null> {
  const asked = async (): Promise<string> => {
    if (process.platform === 'darwin' && browser.app) return runProgram(PLUTIL.program, [PLUTIL.extract, PLUTIL.versionKey, PLUTIL.raw, ...PLUTIL.stdout, join(browser.app, PLUTIL.plist)], VERSION_TIMEOUT_MS);
    if (process.platform === 'win32' && browser.program) return runProgram(POWERSHELL.program, [...POWERSHELL.args, `${POWERSHELL.before}${browser.program.replaceAll(POWERSHELL.quote, POWERSHELL.quote.repeat(2))}${POWERSHELL.after}`], VERSION_TIMEOUT_MS);
    if (browser.engine === 'unknown' || !browser.program) return '';
    // The program alone (a launcher's own flags could open a window); a Flatpak one through `flatpak run … <app id>`.
    const [program, ...args] =
      basename(browser.program) === FLATPAK.program ? [...browser.command.slice(0, browser.urlAt).filter((arg) => !FLATPAK.markers.includes(arg)), VERSION_FLAG] : [browser.program, VERSION_FLAG];
    return runProgram(program, args, VERSION_TIMEOUT_MS);
  };
  const answer = await asked().catch(() => '');
  return VERSION_NUMBER.exec(answer)?.[0] ?? null;
}
