import type { UIEvent } from 'react';
import { ComparePane } from './ComparePane';
import type { CompareViewProps } from './types';

/** Both shots beside each other, scrolled together (scrolling either moves both). */
export function SideBySide({ base, other, zoom }: CompareViewProps) {
  const follow = (event: UIEvent<HTMLDivElement>) => {
    const pane = event.currentTarget;
    const twin = pane.parentElement?.querySelector<HTMLDivElement>(`[data-pane="${pane.dataset.pane === 'base' ? 'other' : 'base'}"]`);
    if (twin && (twin.scrollTop !== pane.scrollTop || twin.scrollLeft !== pane.scrollLeft)) twin.scrollTo(pane.scrollLeft, pane.scrollTop);
  };
  return (
    <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-line" data-testid="compare-side">
      <ComparePane shot={base} zoom={zoom} side="base" onScroll={follow} />
      <ComparePane shot={other} zoom={zoom} side="other" onScroll={follow} />
    </div>
  );
}
