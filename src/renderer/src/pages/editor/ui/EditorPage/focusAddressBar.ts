import { useLayout } from '../../model/layout';
import { addressBar } from './addressBar';

const { togglePreview } = useLayout.getState();

export function focusAddressBar(): void {
  if (!useLayout.getState().previewVisible) togglePreview();
  // A preview shown just now has its address bar by the next frame.
  requestAnimationFrame(() => {
    addressBar.current?.focus();
    addressBar.current?.select();
  });
}
