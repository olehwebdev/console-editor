import type { Session } from 'electron';
import { BYPASS_CACHE } from './constants';

/** A file's text as the site serves it now, through its session (with its cookies). */
export async function fetchUncached(siteSession: Session, url: string): Promise<string> {
  const res = await siteSession.fetch(url, { credentials: 'include', headers: BYPASS_CACHE });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}
