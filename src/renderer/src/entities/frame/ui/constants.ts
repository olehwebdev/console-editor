import type { WorkspaceColor } from '@common/types';

/** A frame chip in each colour; written out in full so Tailwind sees every class. */
export const FRAME_TINT: Record<WorkspaceColor, string> = {
  ember: 'bg-workspace-ember/15 text-workspace-ember',
  amber: 'bg-workspace-amber/15 text-workspace-amber',
  lime: 'bg-workspace-lime/15 text-workspace-lime',
  teal: 'bg-workspace-teal/15 text-workspace-teal',
  sky: 'bg-workspace-sky/15 text-workspace-sky',
  indigo: 'bg-workspace-indigo/15 text-workspace-indigo',
  violet: 'bg-workspace-violet/15 text-workspace-violet',
  rose: 'bg-workspace-rose/15 text-workspace-rose',
};

/** A frame's colour as a dot (filter chips, the picker). */
export const FRAME_DOT: Record<WorkspaceColor, string> = {
  ember: 'bg-workspace-ember',
  amber: 'bg-workspace-amber',
  lime: 'bg-workspace-lime',
  teal: 'bg-workspace-teal',
  sky: 'bg-workspace-sky',
  indigo: 'bg-workspace-indigo',
  violet: 'bg-workspace-violet',
  rose: 'bg-workspace-rose',
};
