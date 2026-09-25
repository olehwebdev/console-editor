import { usePageStore } from '@/entities/page';
import { attachPage } from '@/features/detach-page';
import { useLayout } from '../../model/layout';

const { togglePreview } = useLayout.getState();

/** The title bar's preview button. While the website has a window of its own, it brings the website back into the editor (whose preview then shows it). */
export function toggleWebsitePreview(): void {
  if (usePageStore.getState().page.detached) return void attachPage();
  togglePreview();
}
