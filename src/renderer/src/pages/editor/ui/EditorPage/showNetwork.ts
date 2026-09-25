import { useLayout } from '../../model/layout';

/** Shows the Network panel in the bottom pane (the palette's Show network). */
export function showNetwork(): void {
  useLayout.getState().showBottomView('network');
}
