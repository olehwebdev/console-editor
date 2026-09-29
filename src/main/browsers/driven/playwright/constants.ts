/**
 * The CDP resource type the engine's matching knows for each of Playwright's (`request.resourceType()`); anything else
 * is `Other`.
 */
export const RESOURCE_TYPES: Readonly<Record<string, string>> = {
  document: 'Document',
  stylesheet: 'Stylesheet',
  image: 'Image',
  media: 'Media',
  font: 'Font',
  script: 'Script',
  texttrack: 'TextTrack',
  xhr: 'XHR',
  fetch: 'Fetch',
  eventsource: 'EventSource',
  websocket: 'WebSocket',
  manifest: 'Manifest',
  ping: 'Ping',
};
export const OTHER_RESOURCE = 'Other';

/** Every request goes through the app's answering. */
export const ALL_URLS = '**/*';

/** Why a request a block rule takes fails, as the page sees it. */
export const BLOCKED = 'blockedbyclient';

/** How far opening an address waits: until it is on its way (a tab opened), or loaded (a tab captured). */
export const WAIT = { started: 'commit', loaded: 'load' } as const;

/** A tab's id: the order it was found in, after this. */
export const TAB_ID_PREFIX = 'tab-';

/** Where a browser launched through Playwright keeps its cookies and storage between runs, in its profile folder. */
export const STATE_FILE = 'storage-state.json';

/** Headers a response is fulfilled with, one value per name: several of one name joined as a browser would. */
export const HEADER_JOIN = { 'set-cookie': '\n', other: ', ' } as const;

/** What a browser Playwright launched said on its way out (`[pid=…][err] …` lines of the error), and how many are told. */
export const BROWSER_SAID = /^\[pid=\d+\]\[err\] (.+)$/;
export const LINES_TOLD = 3;

/** What a Linux browser missing a system library says, and what to do about it for WebKit. */
export const MISSING_LIBRARY = 'shared librar';
export const INSTALL_DEPS_HINT = 'on Linux, `sudo npx playwright install-deps webkit` installs the libraries it needs';
