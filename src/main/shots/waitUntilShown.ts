import type { WebContentsView } from 'electron';
import { SHOWN_WAIT } from './constants';

/**
 * Waits for the page's view to be on screen: a menu that hid it (the page shows as a still under menus) gives it back
 * as it closes. Rejects when it stays hidden (the website preview is closed).
 */
export async function waitUntilShown(view: WebContentsView): Promise<void> {
  const deadline = Date.now() + SHOWN_WAIT.timeoutMs;
  for (;;) {
    const { width, height } = view.getBounds();
    if (width > 0 && height > 0) return;
    if (Date.now() > deadline) throw new Error('Show the website to capture it');
    await new Promise((resolve) => setTimeout(resolve, SHOWN_WAIT.stepMs));
  }
}
