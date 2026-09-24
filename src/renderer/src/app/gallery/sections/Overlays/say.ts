import { toast } from '@/shared/ui/toast';

/** How long a demo's acknowledgement stays on screen. */
const SAY_MS = 1600;

/** Acknowledges a demo action with a short toast. */
export const say = (what: string) => toast({ title: what, duration: SAY_MS });
