import { z } from 'zod';
import type { OverlaySettings } from '../types';

/** How far a design can be moved from the page's top left, either way, in CSS pixels. */
const MAX_OFFSET = 100_000;

/** A design overlay's settings: each within its range; unknown keys are dropped. */
export const overlaySettingsSchema = z.toZod<OverlaySettings>()(
  z.object({
    opacity: z.number().min(0).max(1),
    blend: z.enum(['normal', 'difference']),
    invert: z.boolean(),
    x: z.number().int().min(-MAX_OFFSET).max(MAX_OFFSET),
    y: z.number().int().min(-MAX_OFFSET).max(MAX_OFFSET),
    attached: z.enum(['page', 'viewport']),
    hidden: z.boolean(),
    fitWidth: z.boolean(),
  }),
);
