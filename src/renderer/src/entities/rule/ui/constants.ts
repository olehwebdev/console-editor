import type { HeaderEdit, HeaderOperation, RuleAction, RuleResourceType } from '@common/types';
import { icons } from '@/shared/config';
import type { IconGlyph } from '@/shared/ui/icon';
import type { HeaderOperationField } from './types';

/** Each action's glyph and its tint. */
export const RULE_ACTION_GLYPHS: Record<RuleAction, { icon: IconGlyph; className: string }> = {
  block: { icon: icons.BlockIcon, className: 'text-danger' },
  headers: { icon: icons.HeadersIcon, className: 'text-info' },
  cors: { icon: icons.CorsIcon, className: 'text-accent' },
};

/** Each action in a word, for pills and search keywords. */
export const RULE_ACTION_LABELS: Record<RuleAction, string> = {
  block: 'Block',
  headers: 'Headers',
  cors: 'CORS',
};

/** What each action does, as a title (menus, the editor's header). */
export const RULE_ACTION_TITLES: Record<RuleAction, string> = {
  block: 'Block requests',
  headers: 'Change response headers',
  cors: 'Allow cross-origin requests',
};

/** The hit counter's tooltip, by action: `n` times it applied this session. */
export const RULE_HIT_TOOLTIPS: Record<RuleAction, (n: number) => string> = {
  block: (n) => `Blocked ${n}× this session`,
  headers: (n) => `Changed ${n} ${n === 1 ? 'response' : 'responses'} this session`,
  cors: (n) => `Allowed ${n} ${n === 1 ? 'response' : 'responses'} this session`,
};

/** Request types as the type filter names them. */
export const RESOURCE_TYPE_LABELS: Record<RuleResourceType, string> = {
  Document: 'Pages & frames',
  Stylesheet: 'CSS',
  Script: 'JS',
  Image: 'Images',
  Font: 'Fonts',
  Media: 'Media',
  XHR: 'Fetch/XHR',
  Ping: 'Beacons',
  Other: 'Other',
};

/** Header names offered as the name field is typed in (any other name can be typed). */
export const COMMON_HEADER_NAMES: readonly string[] = [
  'Access-Control-Allow-Credentials',
  'Access-Control-Allow-Headers',
  'Access-Control-Allow-Methods',
  'Access-Control-Allow-Origin',
  'Access-Control-Expose-Headers',
  'Cache-Control',
  'Content-Disposition',
  'Content-Security-Policy',
  'Content-Security-Policy-Report-Only',
  'Content-Type',
  'Cross-Origin-Embedder-Policy',
  'Cross-Origin-Opener-Policy',
  'Cross-Origin-Resource-Policy',
  'Expires',
  'Permissions-Policy',
  'Pragma',
  'Referrer-Policy',
  'Strict-Transport-Security',
  'Timing-Allow-Origin',
  'Vary',
  'X-Content-Type-Options',
  'X-Frame-Options',
];

/** How each header operation shows in a row. */
export const HEADER_OPERATION_FIELDS: Record<HeaderOperation, HeaderOperationField> = {
  set: { label: 'Set — replaces the header, or adds it', takesValue: true },
  remove: { label: 'Remove — drops the header', takesValue: false },
};

/** A row added with "Add header". */
export const BLANK_HEADER_EDIT: Readonly<HeaderEdit> = { operation: 'set', name: '', value: '' };
