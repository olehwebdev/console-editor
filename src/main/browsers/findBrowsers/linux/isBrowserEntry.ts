import { DESKTOP_ENTRY } from './constants';

const TRUE = 'true';

/** Whether a launcher's keys are a browser's to offer: an application shown in menus that files itself as a browser, or opens web links and HTML. */
export function isBrowserEntry(keys: Record<string, string>, fileId: string): boolean {
  if (keys.Type !== 'Application' || !keys.Exec || !keys.Name) return false;
  if (keys.NoDisplay === TRUE || keys.Hidden === TRUE || keys.Terminal === TRUE) return false;
  if (fileId.includes(DESKTOP_ENTRY.ownName)) return false;
  // Lists of the spec's kind: `a;b;`.
  if ((keys.Categories ?? '').split(';').includes(DESKTOP_ENTRY.browserCategory)) return true;
  const types = (keys.MimeType ?? '').split(';');
  return types.includes(DESKTOP_ENTRY.html) && DESKTOP_ENTRY.webSchemes.some((scheme) => types.includes(scheme));
}
