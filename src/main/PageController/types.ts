import type { AppEvent, Breakpoint } from '../../shared/types';
import type { OverrideStore } from '../store/OverrideStore';
import type { PageWindowStore } from '../store/PageWindowStore';
import type { RuleStore } from '../store/RuleStore';
import type { SettingsStore } from '../store/SettingsStore';

/** What the page reads as it runs, and where it reports. */
export interface PageDeps {
  store: OverrideStore;
  rules: RuleStore;
  settings: SettingsStore;
  send(event: AppEvent): void;
  /** Where the website's own window was, and whether it was out. */
  windowStore: PageWindowStore;
  /** The active workspace's breakpoints, read as requests pause. */
  breakpoints(): readonly Breakpoint[];
}
