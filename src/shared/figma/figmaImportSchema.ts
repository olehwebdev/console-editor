import { z } from 'zod';
import type { FigmaImport } from '../types';
import { MAX_FIGMA_TOKEN } from './constants';
import { figmaFrameOf } from './figmaFrameOf';

const NEEDS_FRAME = 'Paste the link to a frame: select it in Figma, then Share › Copy link';
const BAD_TOKEN = "That isn't a Figma token";

/** A Figma frame to import: a link naming a frame, and a token (trimmed; '' uses the one kept). Unknown keys are dropped. */
export const figmaImportSchema = z.toZod<FigmaImport>()(
  z.object(
    {
      link: z
        .string({ error: NEEDS_FRAME })
        .trim()
        .refine((link) => figmaFrameOf(link) !== null, { error: NEEDS_FRAME }),
      token: z.string({ error: BAD_TOKEN }).trim().max(MAX_FIGMA_TOKEN, { error: BAD_TOKEN }),
    },
    { error: 'A Figma link is needed' },
  ),
);
