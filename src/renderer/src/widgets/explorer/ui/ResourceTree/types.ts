import type { TreeRowProps } from '@/shared/ui/tree';
import type { ExplorerRow } from '../../lib';

/** Position and keyboard handling that come from the whole row model, not the rendered window. */
export type RowNav = Pick<TreeRowProps, 'aria-posinset' | 'aria-setsize' | 'onKeyDown'>;

/** What every row needs from the tree around it. */
export interface RowContext {
  /** The filter, trimmed. */
  query: string;
  /** The URL of the file tab in front, if any. */
  activeUrl: string | null;
  /** The source key of the original in front, if any. */
  activeSourceKey: string | null;
  /** Opens or closes an origin or folder of the page's files. */
  toggleFolder(key: string): void;
}

export interface RowProps<R extends ExplorerRow> {
  row: R;
  context: RowContext;
  nav: RowNav;
}
