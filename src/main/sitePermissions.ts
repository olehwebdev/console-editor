import {
  dialog,
  type BrowserWindow,
  type MediaAccessPermissionRequest,
  type OpenExternalPermissionRequest,
  type PermissionRequest,
  type Session,
} from 'electron';

type Details = PermissionRequest | MediaAccessPermissionRequest | OpenExternalPermissionRequest;

/** Harmless, and pages break without them: granted without asking. */
const GRANTED = new Set(['fullscreen', 'clipboard-sanitized-write', 'pointerLock']);

/** Worth a prompt: sites under development may genuinely need them. Everything else is denied. */
const ASKED: Record<string, string> = {
  media: 'use your camera or microphone',
  geolocation: 'know your location',
  notifications: 'show notifications',
  'clipboard-read': 'read your clipboard',
  midi: 'use your MIDI devices',
  midiSysex: 'use your MIDI devices',
  openExternal: 'open another application',
  'local-network-access': 'reach devices on your local network',
  'local-network': 'reach devices on your local network',
  'loopback-network': 'reach servers on this computer',
};

function originOf(url: string | undefined): string {
  try {
    return new URL(url ?? '').origin;
  } catch {
    return url || 'This page';
  }
}

function describe(permission: string, details: Details): string {
  if ('mediaTypes' in details && details.mediaTypes?.length) {
    const types = details.mediaTypes.map((t) => (t === 'video' ? 'camera' : 'microphone'));
    return `use your ${types.join(' and ')}`;
  }
  return ASKED[permission] ?? permission;
}

/**
 * Electron grants every permission when a session has no handler, so any site
 * opened in the editor (or an iframe in it) could read the clipboard, use the
 * microphone or launch other applications without asking. Deny by default;
 * ask, once per origin and permission while the app runs, for the few a site
 * under development may need.
 */
export function installSitePermissions(site: Session, win: BrowserWindow): void {
  const decided = new Map<string, boolean>();

  site.setPermissionRequestHandler((_wc, permission, callback, details) => {
    if (GRANTED.has(permission)) return callback(true);
    if (!(permission in ASKED)) return callback(false);
    const origin = originOf(details.requestingUrl);
    // Launching another application depends on the URL: always ask, never remember.
    const key = permission === 'openExternal' ? undefined : `${origin}|${permission}`;
    const known = key ? decided.get(key) : undefined;
    if (known !== undefined) return callback(known);
    const externalUrl = 'externalURL' in details ? details.externalURL : undefined;
    void dialog
      .showMessageBox(win, {
        type: 'question',
        buttons: ['Allow', 'Block'],
        defaultId: 1,
        cancelId: 1,
        message: `${origin} wants to ${describe(permission, details)}`,
        detail: externalUrl ? `Link: ${externalUrl}` : 'Your answer applies until you quit Console Editor.',
      })
      .then(({ response }) => {
        const allow = response === 0;
        if (key) decided.set(key, allow);
        callback(allow);
      }, () => callback(false));
  });

  site.setPermissionCheckHandler((_wc, permission, requestingOrigin) => {
    if (GRANTED.has(permission)) return true;
    return decided.get(`${originOf(requestingOrigin)}|${permission}`) === true;
  });
}
