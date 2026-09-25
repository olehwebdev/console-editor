import { WebContentsView, type BrowserWindow, type Session } from 'electron';

/** A browser's default page background, until the site paints its own. */
const PAGE_BACKGROUND = '#ffffff';

/** The view that shows the site, added to `win` with no size until the renderer lays it out. */
export function createPageView(win: BrowserWindow, siteSession: Session): WebContentsView {
  const view = new WebContentsView({
    webPreferences: { session: siteSession, contextIsolation: true, sandbox: true },
  });
  view.setBackgroundColor(PAGE_BACKGROUND);
  win.contentView.addChildView(view);
  view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  return view;
}
