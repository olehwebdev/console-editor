/**
 * How long a folder of override files has to stay quiet before the files changed in it are read: an
 * editor's save can be several writes (truncate, write, rename over), and a checkout touches many files.
 */
export const EDIT_SETTLE_MS = 200;

/** The scheme VS Code registers on every platform to open a file: `vscode://file/<absolute path>`. */
export const VSCODE_FILE_URL = 'vscode://file';
