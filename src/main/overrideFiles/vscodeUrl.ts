import { pathToFileURL } from 'node:url';
import { VSCODE_FILE_URL } from './constants';

/** The URL that opens the file at `path` in VS Code: its file URL's path (encoded, `/C:/…` on Windows) under VS Code's scheme. */
export function vscodeUrl(path: string): string {
  return `${VSCODE_FILE_URL}${pathToFileURL(path).pathname}`;
}
