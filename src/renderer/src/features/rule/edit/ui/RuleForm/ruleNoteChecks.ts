import { compileMatcher } from '@common/matcher';
import { ALLOW_ORIGIN_HEADER_NAMES, CACHE_HEADER_NAMES, DOCUMENT_SECURITY_HEADER_NAMES } from './constants';
import { editsName } from './editsName';
import type { RuleNoteCheck } from './types';

/** The notes the form can show, in order, with when each applies. */
export const RULE_NOTE_CHECKS: readonly RuleNoteCheck[] = [
  {
    id: 'regex',
    applies: (value) => value.match.type === 'regex',
    text: 'A regex pattern pauses every request on the page. Prefer a glob to keep pages fast.',
  },
  {
    id: 'matches-page',
    // Compiled here rather than cached: the pattern changes with every keystroke.
    applies: (value, pageUrl) => value.action === 'block' && pageUrl !== '' && compileMatcher(value.match)(pageUrl),
    text: "Matches the page you're editing: the page itself is never blocked, only its files and iframes.",
  },
  {
    id: 'cache-headers',
    applies: (value) => editsName(value, CACHE_HEADER_NAMES),
    text: "Changes what the page sees. The browser's HTTP cache keeps the server's headers; Settings › Disable HTTP cache is what skips it.",
  },
  {
    id: 'document-security',
    applies: (value) => editsName(value, DOCUMENT_SECURITY_HEADER_NAMES),
    text: "Pages are re-served to apply this. A CSP in a <meta> tag isn't a header: Settings › Bypass Content-Security-Policy covers it.",
  },
  {
    id: 'allow-origin',
    applies: (value) => editsName(value, ALLOW_ORIGIN_HEADER_NAMES),
    text: 'For preflights and cookies, use an Allow cross-origin requests rule.',
  },
];
