/** Figma's REST API, and the header its personal access tokens go in. */
export const FIGMA_API = 'https://api.figma.com';
export const TOKEN_HEADER = 'X-Figma-Token';

/** A frame is exported as PNG at twice its size, the design's scale (its name says so: `@2x`). */
export const EXPORT = { format: 'png', scale: 2, suffix: '@2x.png' } as const;

/** How long a request to Figma (an export can take a while to render) may take. */
export const FIGMA_TIMEOUT_MS = 60_000;

/** Characters a frame's name can't keep in a file name (path separators and the like), and line breaks: one space each run. */
export const NAME_UNSAFE = /[\\/:*?"<>|\s]+/g;

/** Figma's answers that mean something to say, by status; any other is said as it is. */
export const FIGMA_STATUS: Readonly<Record<number, string>> = {
  403: "Figma refused the token: make one with read access to files in Figma (Settings › Security › Personal access tokens)",
  404: "Figma has no such file, or your token can't open it",
  429: 'Figma asks to wait before more requests: try again in a minute',
};

/** Where the token is kept, in the data folder (encrypted by the system). */
export const TOKEN_FILE = 'figma-token';

/** The storage Chromium falls back to on Linux without a keyring: its "encryption" is a known key, so nothing is kept. */
export const BASIC_TEXT_BACKEND = 'basic_text';
export const LINUX = 'linux';

/** A token kept only by the user can read. */
export const TOKEN_FILE_MODE = 0o600;
