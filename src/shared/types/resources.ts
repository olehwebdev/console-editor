/** The resource kinds we can override. Values match CDP `Network.ResourceType`. */
export type ResourceKind = 'Document' | 'Script' | 'Stylesheet';

export const RESOURCE_KINDS: readonly ResourceKind[] = ['Document', 'Script', 'Stylesheet'];

export interface ResourceEntry {
  url: string;
  kind: ResourceKind;
  mimeType: string;
  status: number;
  /** Set when the response the page received was served from an override. */
  overrideId?: string;
  /**
   * Set when the file was loaded by an iframe rather than the top-level page:
   * the iframe's document URL and nesting depth (1 = iframe, 2 = iframe in an iframe…).
   */
  frame?: { url: string; depth: number };
  /**
   * Opaque id of the cross-site (out-of-process) iframe session that reported
   * the entry. Such entries disappear when that iframe navigates or goes away.
   */
  iframeId?: string;
}

export interface ResourceContent {
  url: string;
  content: string;
  /** sha256 of the content as delivered by the server (hex). */
  hash: string;
}
