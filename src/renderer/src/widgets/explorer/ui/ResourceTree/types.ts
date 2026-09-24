import type { TreeRowProps } from '@/shared/ui/tree';

/** Position and keyboard handling that come from the whole row model, not the rendered window. */
export type RowNav = Pick<TreeRowProps, 'aria-posinset' | 'aria-setsize' | 'onKeyDown'>;
