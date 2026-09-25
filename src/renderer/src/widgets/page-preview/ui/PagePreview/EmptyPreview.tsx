import { AnimatePresence, motion } from 'motion/react';
import { icons } from '@/shared/config';
import { DURATION, EASE_OUT } from '@/shared/lib';
import { EmptyState } from '@/shared/ui/empty-state';

/** The empty state fading in or out, in seconds. */
const EMPTY_FADE_DURATION = DURATION.medium3;

/** Fills the host with a hint on how to open a website while there's no page, fading in and out. */
export function EmptyPreview({ hasPage }: { hasPage: boolean }) {
  return (
    <AnimatePresence>
      {!hasPage ? (
        <motion.div
          key="empty"
          className="absolute inset-0 flex items-center justify-center bg-surface"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: EMPTY_FADE_DURATION, ease: EASE_OUT }}
        >
          <EmptyState icon={icons.BrowserIcon} title="The website appears here">
            Type its address above and press Enter. Log in once; sessions are kept.
          </EmptyState>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
