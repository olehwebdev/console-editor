import { useLayout } from '../../model/layout';

const { setResizing } = useLayout.getState();

/** A panel divider started being dragged. */
export const startResize = () => setResizing(true);
