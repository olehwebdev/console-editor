import type { Workspace, WorkspaceColor } from '@common/types';
import { icons } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import { workspaceInitial } from '../lib/label';

/** Written out in full so Tailwind sees every class. */
const TINT: Record<WorkspaceColor, string> = {
  ember: 'bg-workspace-ember/15 text-workspace-ember ring-workspace-ember/35',
  amber: 'bg-workspace-amber/15 text-workspace-amber ring-workspace-amber/35',
  lime: 'bg-workspace-lime/15 text-workspace-lime ring-workspace-lime/35',
  teal: 'bg-workspace-teal/15 text-workspace-teal ring-workspace-teal/35',
  sky: 'bg-workspace-sky/15 text-workspace-sky ring-workspace-sky/35',
  indigo: 'bg-workspace-indigo/15 text-workspace-indigo ring-workspace-indigo/35',
  violet: 'bg-workspace-violet/15 text-workspace-violet ring-workspace-violet/35',
  rose: 'bg-workspace-rose/15 text-workspace-rose ring-workspace-rose/35',
};

/** A swatch of each colour (the colour picker). */
export const WORKSPACE_SWATCH: Record<WorkspaceColor, string> = {
  ember: 'bg-workspace-ember',
  amber: 'bg-workspace-amber',
  lime: 'bg-workspace-lime',
  teal: 'bg-workspace-teal',
  sky: 'bg-workspace-sky',
  indigo: 'bg-workspace-indigo',
  violet: 'bg-workspace-violet',
  rose: 'bg-workspace-rose',
};

const SIZE = {
  md: { box: 'size-7 rounded-lg text-[12.5px]', image: 'size-4', glyph: 14 },
  lg: { box: 'size-10 rounded-xl text-[17px]', image: 'size-6', glyph: 18 },
} as const;

export interface WorkspaceIconProps {
  workspace: Pick<Workspace, 'name' | 'host' | 'icon' | 'color'>;
  /** The site's icon; the colour tile stands in while there is none. */
  favicon?: string | null;
  size?: keyof typeof SIZE;
  className?: string;
}

/**
 * A workspace's tile: its site's favicon, or its first letter, on its colour.
 * The colour shows either way, so two workspaces on one site stay apart.
 */
export function WorkspaceIcon({ workspace, favicon, size = 'md', className }: WorkspaceIconProps) {
  const dims = SIZE[size];
  const image = workspace.icon === 'favicon' ? favicon : null;
  const initial = workspaceInitial(workspace);
  return (
    <span
      aria-hidden
      data-icon={image ? 'favicon' : 'color'}
      className={cn('grid shrink-0 select-none place-items-center overflow-hidden font-semibold leading-none ring-1 ring-inset', TINT[workspace.color], dims.box, className)}
    >
      {image ? (
        <img src={image} alt="" draggable={false} className={cn('object-contain', dims.image)} />
      ) : initial ? (
        initial
      ) : (
        <Icon icon={icons.GlobeIcon} size={dims.glyph} />
      )}
    </span>
  );
}
