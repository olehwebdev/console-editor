import type { Workspace } from '@common/types';

type Named = Pick<Workspace, 'name' | 'host'>;

/** What a workspace is called: its name, or else the host of its page. */
export function workspaceLabel(w: Named): string {
  return w.name.trim() || w.host || 'New workspace';
}

/** An IP address (with a port, perhaps): its first digit says nothing. */
const IP_HOST = /^(\d+\.\d+\.\d+\.\d+|\[[\da-f:.]+\])(:\d+)?$/i;

/**
 * The letter on its colour tile (the first character, so an emoji works too);
 * '' before it has a name or a page, or when its page has an IP address for a host.
 */
export function workspaceInitial(w: Named): string {
  const label = w.name.trim() || (IP_HOST.test(w.host) ? '' : w.host.replace(/^www\./, ''));
  return (Array.from(label)[0] ?? '').toUpperCase();
}

/** What tells it apart when the label doesn't: the page's title, or its host when it has a name. */
export function workspaceDetail(w: Pick<Workspace, 'name' | 'host' | 'title'>): string {
  return w.title || (w.name.trim() ? w.host : '');
}
