// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
import { useState, type ComponentPropsWithRef } from 'react';
import { cn, EASE_OUT, SPRING_SWAP } from '@/shared/lib';

export interface CounterProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  /** Integer to show (rounded). Built for small counts: badges, tabs, section headers. */
  value: number;
  /** Left-pad with zeros to this many digits. */
  pad?: number;
}

type Direction = 'up' | 'down';

// Increasing values roll up (new digit from below), decreasing roll down.
const GLYPH: Variants = {
  initial: (d: Direction) => ({ opacity: 0, y: d === 'up' ? '60%' : '-60%' }),
  animate: { opacity: 1, y: '0%', transition: SPRING_SWAP },
  exit: (d: Direction) => ({ opacity: 0, y: d === 'up' ? '-60%' : '60%', transition: { duration: 0.12, ease: EASE_OUT } }),
};

const GLYPH_REDUCED: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.12 } },
  exit: { opacity: 0, transition: { duration: 0.08 } },
};

/**
 * Animated integer: only the digits that change roll, in the direction of the
 * change (transform + opacity only). Tabular figures keep the width steady;
 * screen readers get the plain number.
 */
export function Counter({ value, pad, className, ...rest }: CounterProps) {
  const reduce = useReducedMotion();
  const rounded = Number.isFinite(value) ? Math.round(value) : 0;

  // Derive the roll direction from the previous value (state-from-props pattern).
  const [previous, setPrevious] = useState({ value: rounded, direction: 'up' as Direction });
  if (previous.value !== rounded) {
    setPrevious({ value: rounded, direction: rounded > previous.value ? 'up' : 'down' });
  }
  const direction = previous.direction;

  const digits = Math.abs(rounded).toString();
  const text = (rounded < 0 ? '-' : '') + (pad ? digits.padStart(pad, '0') : digits);
  // Key glyphs by place value (from the right), so the ones digit keeps its
  // slot when the number grows a digit on the left.
  const glyphs = Array.from(text, (char, i) => ({ char, place: text.length - 1 - i }));

  return (
    <span className={cn('inline-block whitespace-nowrap tabular-nums', className)} {...rest}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {glyphs.map(({ char, place }) =>
          /\d/.test(char) ? (
            // clip-path (not overflow) clips the roll without moving the slot's text baseline.
            <span key={`d${place}`} className="relative inline-block [clip-path:inset(0)]">
              {/* In-flow placeholder: gives the slot its (tabular) width, height and baseline. */}
              <span className="invisible">0</span>
              <AnimatePresence initial={false} custom={direction}>
                <motion.span
                  key={char}
                  custom={direction}
                  variants={reduce ? GLYPH_REDUCED : GLYPH}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="absolute inset-0 flex items-center justify-center"
                >
                  {char}
                </motion.span>
              </AnimatePresence>
            </span>
          ) : (
            <span key={`s${place}`}>{char}</span>
          ),
        )}
      </span>
    </span>
  );
}
