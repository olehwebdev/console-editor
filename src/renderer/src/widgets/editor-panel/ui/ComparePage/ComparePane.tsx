import type { UIEvent } from 'react';
import type { Shot } from '@common/types';
import { shotUrl } from '@/entities/shot';
import { cssSize } from './cssSize';

export interface ComparePaneProps {
  shot: Shot;
  zoom: number;
  /** Which side it is, so the other side can find it to scroll along. */
  side: 'base' | 'other';
  onScroll(event: UIEvent<HTMLDivElement>): void;
}

/** One side of a side-by-side comparison: a shot at the zoom, in a pane of its own. */
export function ComparePane({ shot, zoom, side, onScroll }: ComparePaneProps) {
  const { width, height } = cssSize(shot);
  return (
    <div data-pane={side} onScroll={onScroll} className="min-h-0 overflow-auto bg-surface">
      <img src={shotUrl(shot)} alt={shot.name} draggable={false} style={{ width: width * zoom, height: height * zoom }} className="m-6 block max-w-none shadow-overlay" />
    </div>
  );
}
