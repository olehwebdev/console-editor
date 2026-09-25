import { session, type BrowserWindow, type Session } from 'electron';
import { installSitePermissions } from '../sitePermissions';
import { chromeUserAgent } from './chromeUserAgent';

/** Session partition for the site being edited: cookies/logins survive restarts. */
const SITE_PARTITION = 'persist:site';

/** The site's session: its own partition, a plain Chrome user agent, and the permissions it may ask for over the window showing it (`parent`). */
export function openSiteSession(parent: () => BrowserWindow): Session {
  const siteSession = session.fromPartition(SITE_PARTITION);
  siteSession.setUserAgent(chromeUserAgent(siteSession.getUserAgent()));
  installSitePermissions(siteSession, parent);
  return siteSession;
}
