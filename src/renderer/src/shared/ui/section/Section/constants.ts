import type { Transition } from 'motion/react';
import type { SectionCountTone } from './types';

export const INSTANT: Transition = { duration: 0 };

export const COUNT_TONE: Record<SectionCountTone, string> = {
  neutral: 'bg-hover text-fg-muted',
  accent: 'bg-accent/12 text-accent',
  live: 'bg-live/12 text-live',
};
