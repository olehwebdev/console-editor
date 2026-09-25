// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { motion } from 'motion/react';
import { DURATION, EASE_OUT } from '@/shared/lib';

/** The scrim behind the panel; a click on it closes the palette. */
export function PaletteBackdrop({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: DURATION.short3, ease: EASE_OUT } }}
      transition={{ duration: DURATION.medium1, ease: EASE_OUT }}
      onClick={onClose}
      className="absolute inset-0 bg-scrim"
    />
  );
}
