// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { animate, useMotionValue, useTransform } from 'motion/react';
import { useEffect } from 'react';
import { STACK_SPRING } from './constants';

const RADIUS = 12;
/** The least scale the radius is counter-scaled for, so it never divides by (nearly) zero. */
const MIN_COUNTER_SCALE = 0.05;

interface SqueezeOptions {
  stacked: boolean;
  /** The card's natural height, once measured. */
  height: number | undefined;
  frontHeight: number;
  reduce: boolean;
}

/**
 * Stacked cards borrow the front card's height by scaling their background (not
 * animating `height`); the radius is counter-scaled so the corners stay round.
 */
export function useSqueezedBackground({ stacked, height, frontHeight, reduce }: SqueezeOptions) {
  const bgScale = useMotionValue(1);
  const bgRadius = useTransform(bgScale, (s) => `${RADIUS}px / ${RADIUS / Math.max(s, MIN_COUNTER_SCALE)}px`);
  const bgTarget = stacked && height && frontHeight ? frontHeight / height : 1;
  // The background's scale follows the stack, springing unless motion is reduced.
  useEffect(() => {
    if (reduce) {
      bgScale.set(bgTarget);
      return;
    }
    const controls = animate(bgScale, bgTarget, STACK_SPRING);
    return () => controls.stop();
  }, [bgTarget, reduce, bgScale]);
  return { bgScale, bgRadius };
}
