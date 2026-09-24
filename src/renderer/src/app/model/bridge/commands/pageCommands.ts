import type { PageCommands } from '@/pages/editor';

/** What menu commands like "Focus Address Bar" do on the page; set by `startBridge`. Mutated in place (importers can't reassign another module's bindings). */
export const pageCommands: { current: PageCommands | null } = { current: null };
