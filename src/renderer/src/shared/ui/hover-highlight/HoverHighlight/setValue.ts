// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { animate, type MotionValue } from 'motion/react';
import { SPRING_LAYOUT } from '@/shared/lib';

export function setValue(value: MotionValue<number>, target: number, glide: boolean) {
  if (value.get() === target && !value.isAnimating()) return;
  if (glide) animate(value, target, SPRING_LAYOUT);
  else value.jump(target);
}
