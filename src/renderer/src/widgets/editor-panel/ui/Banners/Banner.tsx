import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn, DURATION, EASE_OUT } from '@/shared/lib';
import { Icon, type IconGlyph } from '@/shared/ui/icon';

type BannerTone = 'info' | 'warning';

/** The row's and the icon's colours, by tone. */
const TONE_CLASS: Record<BannerTone, { row: string; icon: string }> = {
  info: { row: 'bg-info/[0.07] text-fg-muted', icon: 'text-info' },
  warning: { row: 'bg-warning/[0.08] text-fg-muted', icon: 'text-warning' },
};

/** Expanding in or collapsing out, in seconds. */
const EXPAND_DURATION = DURATION.medium3;

/** One hint under the file header: expands in, collapses out. */
export function Banner({ tone, icon, children, action }: { tone: BannerTone; icon: IconGlyph; children: ReactNode; action?: ReactNode }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: EXPAND_DURATION, ease: EASE_OUT }}
      className="overflow-hidden"
    >
      <div className={cn('flex items-center gap-2.5 border-t border-line px-3 py-2 text-[12.5px]', TONE_CLASS[tone].row)}>
        <Icon icon={icon} size={15} className={TONE_CLASS[tone].icon} />
        <span className="min-w-0 flex-1">{children}</span>
        {action}
      </div>
    </motion.div>
  );
}
