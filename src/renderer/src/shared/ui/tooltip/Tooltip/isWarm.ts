// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { warmth } from './warmth';

export const isWarm = () => warmth.openTooltips > 0 || performance.now() < warmth.warmUntil;
