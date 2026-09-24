import { cn } from '@/shared/lib';
import { frameTone } from '../lib/frameTone';
import { FRAME_TINT } from './constants';

export interface FrameChipProps {
  /** The frame's key (`frameKey`): it picks the colour. */
  frameKey: string;
  label: string;
  /** Its full address, shown on hover. */
  title?: string;
  /** The frame is no longer on the page. */
  gone?: boolean;
  className?: string;
}

/** A frame's name on its colour: which service a console row came from. */
export function FrameChip({ frameKey, label, title, gone = false, className }: FrameChipProps) {
  return (
    <span
      title={title}
      data-frame-chip={frameKey}
      className={cn(
        'inline-flex h-[18px] max-w-[180px] shrink-0 items-center truncate rounded-md px-1.5 font-sans text-[11px] font-medium leading-none',
        FRAME_TINT[frameTone(frameKey)],
        gone && 'opacity-50',
        className,
      )}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}
