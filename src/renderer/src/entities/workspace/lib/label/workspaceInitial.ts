import type { Named } from './types';

/** An IP address (with a port, perhaps): its first digit says nothing. */
const IP_HOST = /^(\d+\.\d+\.\d+\.\d+|\[[\da-f:.]+\])(:\d+)?$/i;
/** Left off a host before its first letter is taken. */
const WWW_PREFIX = /^www\./;

/**
 * The letter on its colour tile (the first character, so an emoji works too);
 * '' before it has a name or a page, or when its page has an IP address for a host.
 */
export function workspaceInitial(w: Named): string {
  const label = w.name.trim() || (IP_HOST.test(w.host) ? '' : w.host.replace(WWW_PREFIX, ''));
  return (Array.from(label)[0] ?? '').toUpperCase();
}
