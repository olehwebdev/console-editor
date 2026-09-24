import { useLayout } from '../../model/layout';

const { setResizing } = useLayout.getState();

/** A panel divider's drag or key step ended. */
export const endResize = () => setResizing(false);
