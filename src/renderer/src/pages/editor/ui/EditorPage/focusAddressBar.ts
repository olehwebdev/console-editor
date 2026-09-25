import { usePageStore } from '@/entities/page';
import { detachPage } from '@/features/detach-page';
import { useLayout } from '../../model/layout';
import { addressBar } from './addressBar';

const { togglePreview } = useLayout.getState();

export function focusAddressBar(): void {
  // The address bar went with the website into its own window: that window comes forward, focused there.
  if (usePageStore.getState().page.detached) return void detachPage();
  if (!useLayout.getState().previewVisible) togglePreview();
  // A preview shown just now has its address bar by the next frame.
  requestAnimationFrame(() => {
    addressBar.current?.focus();
    addressBar.current?.select();
  });
}
