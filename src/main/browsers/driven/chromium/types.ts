import type { DrivenTab } from '../../../../shared/types';
import type { PageInterception } from '../../../engine/PageInterception';
import type { PageTransport } from '../../../engine/websocketTransport';

/** A tab of a driven Chromium browser, with the interception serving it. */
export interface DrivenTabState {
  info: DrivenTab;
  sessionId: string;
  transport: PageTransport;
  interception: PageInterception;
  /** Settles once its interception is set up (or couldn't be) and the tab runs. */
  ready: Promise<void>;
}

/** What `Target.attachedToTarget` and `Target.targetInfoChanged` say of a target, as far as a tab needs. */
export interface PageTargetInfo {
  targetId: string;
  type: string;
  url: string;
  title: string;
}

export interface AttachedPage {
  sessionId: string;
  targetInfo: PageTargetInfo;
}
