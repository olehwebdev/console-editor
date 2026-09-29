/** The WebKit build the app downloads (Playwright's), listed as a browser of its own on every system. */
export const WEBKIT_ID = 'playwright:webkit';
export const WEBKIT_NAME = 'WebKit';

/** Its name in Playwright's registry. */
export const REGISTRY_NAME = 'webkit';

/** Where builds are kept, in the data folder. */
export const BUILDS_DIR = ['browsers', 'playwright'] as const;

/** The file a build's folder holds once it is whole (Playwright's own marker). */
export const INSTALLED_MARKER = 'INSTALLATION_COMPLETE';

/** The build's program is made runnable after it is unpacked, as Playwright's installer does. */
export const EXECUTABLE_MODE = 0o755;

/** The download's temporary folder and file. */
export const TEMP_PREFIX = 'console-editor-webkit-';
export const ZIP_NAME = 'webkit.zip';

/** Progress is announced at most this often while downloading. */
export const PROGRESS_EVERY_MS = 250;
