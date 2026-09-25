import type { HeaderEdit, HeldAction, HeldRequest } from '@common/types';

/** What the user changed on a held request, beside its body (the tab's text). Fields as typed. */
export interface HeldDraft {
  /** Request stage: where it goes, and how. */
  url: string;
  method: string;
  /** Response stage: the status it answers with. */
  status: string;
  /** Changes on top of the request's headers (request stage) or the response's (response stage). */
  headers: HeaderEdit[];
  /** Parallel to headers: stable React keys for their rows. */
  rowKeys: string[];
}

export interface HeldDraftStore {
  /** By held id. */
  drafts: Record<string, HeldDraft>;
  set(id: string, draft: HeldDraft): void;
  patch(id: string, patch: Partial<HeldDraft>): void;
  drop(id: string): void;
}

/** What Send does with the user's edits. */
export interface SendInput {
  held: HeldRequest;
  draft: HeldDraft;
  /** The tab's text. */
  text: string;
  /** Whether the text was changed: an unchanged body goes as it came, not as it was formatted. */
  edited: boolean;
}

/** What Send does at each stage. */
export interface StageSendAction {
  request: Extract<HeldAction, { type: 'send' }>;
  response: Extract<HeldAction, { type: 'respond' }>;
}
