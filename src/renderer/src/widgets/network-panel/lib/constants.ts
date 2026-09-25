import type { RequestGroup } from '@/entities/network-request';

/** Requests whose response is a file the editor opens as one (and overrides as a file override). */
export const FILE_GROUPS: ReadonlySet<RequestGroup> = new Set(['doc', 'js', 'css']);

/** Fetch/XHR types a response override never answers: an event stream is never read, a preflight never answered. */
export const UNANSWERED_TYPES: ReadonlySet<string> = new Set(['EventSource', 'Preflight']);
