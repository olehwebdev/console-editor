import type { DrivenTabState } from './types';

/** Stops serving a tab: its interception goes, and its session is let go of. */
export function releaseTab(tab: DrivenTabState): void {
  tab.interception.detach();
  void tab.transport.detach();
}
