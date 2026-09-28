/** What BiDi says of a browsing context: a tab's (no parent) or a frame's. */
export interface ContextInfo {
  context: string;
  url: string;
  parent?: string | null;
}
