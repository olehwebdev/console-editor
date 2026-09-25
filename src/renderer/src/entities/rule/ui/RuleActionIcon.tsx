import type { RuleAction } from '@common/types';
import { cn } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import { RULE_ACTION_GLYPHS } from './constants';

/** The tinted glyph of what a rule does: block (red), headers (sky), CORS (ember). */
export function RuleActionIcon({ action, size, className }: { action: RuleAction; size?: number; className?: string }) {
  const glyph = RULE_ACTION_GLYPHS[action];
  return <Icon icon={glyph.icon} size={size} className={cn(glyph.className, className)} />;
}
