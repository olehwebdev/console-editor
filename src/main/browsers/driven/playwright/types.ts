import type { Browser, BrowserContext, BrowserType, Page } from 'playwright-core';
import type { KeptTab } from '../types';

/** A tab of a browser driven through Playwright: its page. */
export interface PlaywrightTab extends KeptTab {
  page: Page;
}

/** How a browser is launched through Playwright: its kind (WebKit), its program, and whether it shows a window. */
export interface PlaywrightLaunch {
  type: BrowserType;
  executablePath: string;
  headless: boolean;
}

/** A browser launched through Playwright: the browser, its context (the tabs), and where the context's state is kept. */
export interface PlaywrightSession {
  browser: Browser;
  context: BrowserContext;
  stateFile: string;
}
