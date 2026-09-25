import { dialog, type BrowserWindow, type Session } from 'electron';
import { ASKED } from './constants';
import { decisionKey } from './decisionKey';
import { describePermission } from './describePermission';
import { originOf } from './originOf';

/** Harmless, and pages break without them: granted without asking. */
const GRANTED = new Set(['fullscreen', 'clipboard-sanitized-write', 'pointerLock']);

/** The permission prompt's buttons, by index. */
const PROMPT_BUTTON = { allow: 0, block: 1 } as const;

/**
 * Electron grants every permission when a session has no handler, so any site
 * opened in the editor (or an iframe in it) could read the clipboard, use the
 * microphone or launch other applications without asking. Deny by default;
 * ask, once per origin and permission while the app runs, for the few a site
 * under development may need. The prompt opens over the window showing the site (`parent`).
 */
export function installSitePermissions(site: Session, parent: () => BrowserWindow): void {
  const decided = new Map<string, boolean>();

  site.setPermissionRequestHandler((_wc, permission, callback, details) => {
    if (GRANTED.has(permission)) return callback(true);
    if (!(permission in ASKED)) return callback(false);
    const origin = originOf(details.requestingUrl);
    // Launching another application depends on the URL: always ask, never remember.
    const key = permission === 'openExternal' ? undefined : decisionKey(origin, permission);
    const known = key ? decided.get(key) : undefined;
    if (known !== undefined) return callback(known);
    const externalUrl = 'externalURL' in details ? details.externalURL : undefined;
    void dialog
      .showMessageBox(parent(), {
        type: 'question',
        buttons: ['Allow', 'Block'],
        defaultId: PROMPT_BUTTON.block,
        cancelId: PROMPT_BUTTON.block,
        message: `${origin} wants to ${describePermission(permission, details)}`,
        detail: externalUrl ? `Link: ${externalUrl}` : 'Your answer applies until you quit Console Editor.',
      })
      .then(({ response }) => {
        const allow = response === PROMPT_BUTTON.allow;
        if (key) decided.set(key, allow);
        callback(allow);
      }, () => callback(false));
  });

  site.setPermissionCheckHandler((_wc, permission, requestingOrigin) => {
    if (GRANTED.has(permission)) return true;
    return decided.get(decisionKey(originOf(requestingOrigin), permission)) === true;
  });
}
