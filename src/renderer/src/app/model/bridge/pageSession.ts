import type { PageSession } from '@/pages/editor';

/** The page's open tabs and drafts, kept on disk; set by `startBridge`. Mutated in place (importers can't reassign another module's bindings). */
export const pageSession: { current: PageSession | null } = { current: null };
