import { HoverHighlight, type HoverHighlightProps } from '@/shared/ui/hover-highlight';

export interface TreeProps extends Omit<HoverHighlightProps, 'role'> {
  /** Accessible name of the tree (`aria-label`). */
  label?: string;
  /** The moving hover pill (default true). */
  highlight?: boolean;
}

/**
 * `role="tree"` container for <TreeRow>s with the moving hover pill and a
 * keyboard entry point (Tab lands on the selected row, else the first).
 * For virtualized trees, use it as the virtualizer's inner sized element.
 */
export function Tree({ label, highlight = true, 'aria-label': ariaLabel, ...rest }: TreeProps) {
  return <HoverHighlight role="tree" aria-label={ariaLabel ?? label} disabled={!highlight} {...rest} />;
}
