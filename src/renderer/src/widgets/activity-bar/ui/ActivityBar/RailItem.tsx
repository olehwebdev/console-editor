import { motion } from 'motion/react';
import { SPRING_LAYOUT } from '@/shared/lib';
import type { IconGlyph } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';

/** Motion's shared-layout id: one indicator glides between the rail's items. */
const INDICATOR_LAYOUT_ID = 'rail-indicator';

/** One rail button, with the sliding indicator while it is the active view. */
export function RailItem({ id, icon, label, active, onClick, shortcut, badge }: { id: string; icon: IconGlyph; label: string; active: boolean; onClick(): void; shortcut?: string[]; badge?: React.ReactNode }) {
  return (
    <div className="relative flex w-full justify-center">
      {active ? (
        <motion.span layoutId={INDICATOR_LAYOUT_ID} transition={SPRING_LAYOUT} className="absolute inset-y-1 left-0 w-0.5 rounded-r-full bg-accent" />
      ) : null}
      <IconButton data-testid={`rail-${id}`} icon={icon} label={label} size="lg" active={active} onClick={onClick} shortcut={shortcut} tooltipSide="right" badge={badge} />
    </div>
  );
}
