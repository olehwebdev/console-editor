import type { WorkerType } from './workers';

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
  /** Set when this rule blocked the request: the page got no response (`status` 0, `mimeType` ''). */
  blockedBy?: string;
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
  /**
   * Set when a worker loaded the file: the kind of worker and its script URL
   * (a worklet's is the URL of the document that added it).
   */
  worker?: { type: WorkerType; url: string };
  /**
   * Opaque id of the worker session that reported the entry. Such entries
   * disappear when that worker goes away; a service worker's outlive the page
   * that registered it.
   */
  workerId?: string;
}

export interface ResourceContent {
  url: string;
  content: string;
  /** sha256 of the content as delivered by the server (hex). */
  hash: string;
}
