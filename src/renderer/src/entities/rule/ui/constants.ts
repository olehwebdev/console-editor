import type { RuleAction, RuleResourceType } from '@common/types';
import { icons } from '@/shared/config';
import type { IconGlyph } from '@/shared/ui/icon';

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
