import type { WorkerType } from './workers';

/**
 * The resource kinds we can override. Values match CDP `Network.ResourceType`. `Fetch` is a response to
 * fetch() or XMLHttpRequest (a JSON API, say): never listed as a file, it is overridden from the Network
 * panel, and its override can also match the request's method and GraphQL operation (SPEC §6.3).
 */
export type ResourceKind = 'Document' | 'Script' | 'Stylesheet' | 'Fetch';

export const RESOURCE_KINDS: readonly ResourceKind[] = ['Document', 'Script', 'Stylesheet', 'Fetch'];

/** The kinds that are files: listed in the Explorer's tree, and opened from it. */
export type FileKind = Exclude<ResourceKind, 'Fetch'>;

export const FILE_KINDS: readonly FileKind[] = ['Document', 'Script', 'Stylesheet'];

export interface ResourceEntry {
  url: string;
  kind: FileKind;
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
  /**
   * The `SourceMap` (else `X-SourceMap`) header the response carried, as written (unresolved). For a
   * file served from an override: the upstream response's, taken before the override replaced it.
   */
  sourceMap?: string;
}
