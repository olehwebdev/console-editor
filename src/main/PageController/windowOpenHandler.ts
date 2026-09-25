import type { BrowserWindow, HandlerDetails, WindowOpenHandlerResponse } from 'electron';
import { HTTP_SCHEME } from '../constants';

/**
 * Real pop-ups (sign-in flows rely on window.opener) open as child windows of the window showing
 * the page (`parent`); links meant for a new tab go to `load`, which opens them in the page, where overrides apply.
 */
export function windowOpenHandler(parent: () => BrowserWindow, load: (url: string) => void): (details: HandlerDetails) => WindowOpenHandlerResponse {
  return ({ url, disposition }) => {
    if (disposition === 'new-window') {
      return { action: 'allow', overrideBrowserWindowOptions: { parent: parent(), autoHideMenuBar: true } };
    }
    if (HTTP_SCHEME.test(url)) load(url);
    return { action: 'deny' };
  };
}
