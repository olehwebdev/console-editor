import type { SocketDirection } from '../../shared/types';

/** The HAR version written. */
export const HAR_VERSION = '1.2';

/** What HAR says for a size it doesn't know. */
export const UNKNOWN_SIZE = -1;

/** The protocol version written for every entry (Chromium doesn't say which one each used). */
export const HTTP_VERSION = 'HTTP/1.1';

/** The file types the HAR dialogs offer. */
export const HAR_FILTERS = [{ name: 'HAR files', extensions: ['har', 'json'] }];

/** The biggest HAR file imported, in bytes. */
export const MAX_HAR_BYTES = 100 * 1024 * 1024;

/** The most response overrides one import makes. */
export const MAX_HAR_OVERRIDES = 200;

/** The resource types a HAR import turns into response overrides (Chrome DevTools' `_resourceType`): what the page's code asked for. */
export const IMPORTED_RESOURCE_TYPES: ReadonlySet<string> = new Set(['fetch', 'xhr']);

/** The HAR content encoding for bytes as base64. */
export const BASE64_ENCODING = 'base64';

/** A response header naming where a redirect goes. */
export const LOCATION_HEADER = 'location';

/** How Chrome's HAR names which way a WebSocket message went. */
export const HAR_MESSAGE_TYPES: Record<SocketDirection, 'send' | 'receive'> = { sent: 'send', received: 'receive' };
