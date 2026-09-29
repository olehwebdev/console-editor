import { BACKDROP, DIFFERENCE, OVERLAY_ELEMENT_ID, OVERLAY_GLOBAL, TRANSPARENT } from './constants';

/**
 * The overlay's controller, run in its isolated world in each new document (and in the one loaded when a design is
 * laid over it): `setImage` draws a design (base64) on a canvas added to `<html>` once there is one, and put back if
 * the page removes it; `setStyle` places and styles it; `remove` takes it off. A canvas, not an `<img>`: a page's
 * CSP can refuse a data: image, but not pixels drawn from bytes. Blended as a difference, it needs a backdrop: a page
 * that paints no background of its own shows the browser's white, which nothing blends with, so it is given that
 * white (no change to see) while it is, and its own back after. Only a top document gets one: the scripts run in
 * every frame's document.
 */
export const OVERLAY_JS = `(() => {
  if (globalThis.${OVERLAY_GLOBAL} || window.top !== window) return;
  let canvas = null;
  let style = '';
  let difference = false;
  let keeper = null;
  let ownBackground = null;
  const base = () => {
    const root = document.documentElement;
    if (!root) return;
    const clear = (el) => !el || getComputedStyle(el).backgroundColor === '${TRANSPARENT}';
    if (difference && canvas && ownBackground === null && clear(root) && clear(document.body)) {
      ownBackground = root.style.getPropertyValue('background-color');
      root.style.setProperty('background-color', '${BACKDROP}');
    } else if ((!difference || !canvas) && ownBackground !== null) {
      root.style.setProperty('background-color', ownBackground);
      ownBackground = null;
    }
  };
  const attach = () => {
    const root = document.documentElement;
    if (!canvas) return;
    if (!root) {
      const waiting = new MutationObserver(() => {
        if (!document.documentElement) return;
        waiting.disconnect();
        attach();
      });
      waiting.observe(document, { childList: true });
      return;
    }
    if (!canvas.isConnected) root.appendChild(canvas);
    base();
    if (keeper) return;
    keeper = new MutationObserver(() => {
      if (canvas && !canvas.isConnected && document.documentElement) document.documentElement.appendChild(canvas);
    });
    keeper.observe(root, { childList: true });
  };
  globalThis.${OVERLAY_GLOBAL} = {
    async setImage(base64) {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes]));
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = '${OVERLAY_ELEMENT_ID}';
        canvas.setAttribute('aria-hidden', 'true');
      }
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d').drawImage(bitmap, 0, 0);
      bitmap.close();
      canvas.style.cssText = style;
      attach();
    },
    setStyle(css, blend) {
      style = css;
      difference = blend === '${DIFFERENCE}';
      if (canvas) canvas.style.cssText = css;
      if (document.body) base();
    },
    remove() {
      if (keeper) keeper.disconnect();
      keeper = null;
      if (canvas) canvas.remove();
      canvas = null;
      base();
    },
  };
})();`;
