import type { CSSProperties } from 'react';
import type { Shot } from '@common/types';
import { cn } from '@/shared/lib';
import { shotUrl } from '../lib';

export interface ShotThumbProps {
  shot: Pick<Shot, 'id' | 'updatedAt'>;
  /** Its side, in pixels. */
  size: number;
  className?: string;
  /** Where it goes, when it is placed (stacked thumbnails). */
  style?: CSSProperties;
}

/** A shot's thumbnail: the top of its image, in a rounded square. */
export function ShotThumb({ shot, size, className, style }: ShotThumbProps) {
  return (
    <img
      src={shotUrl(shot, 'thumb')}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={cn('shrink-0 rounded-lg bg-surface-raised object-cover object-top ring-1 ring-line', className)}
      style={{ width: size, height: size, ...style }}
    />
  );
}
