import { SOURCE_MAP_KINDS, type SourceMapKind, type SourceMapRequest } from '../../shared/types';
import { HTTP_URL } from '../constants';

/** Longer URLs aren't a bundle the page listed. */
const MAX_URL_CHARS = 8192;
/** A content hash as the engine writes it (sha256, hex). */
const CONTENT_HASH = /^[0-9a-f]{64}$/;

/**
 * Checks a source-map request from the renderer: an http(s) bundle URL (never a map or source URL,
 * which main derives itself), a kind that can have a map, and what the renderer already holds.
 */
export function assertSourceMapRequest(value: unknown): asserts value is SourceMapRequest {
  const request = value as Partial<SourceMapRequest> | null;
  if (typeof request !== 'object' || request === null) throw new Error('request must be an object');
  const { bundleUrl } = request;
  if (typeof bundleUrl !== 'string' || bundleUrl.length > MAX_URL_CHARS || !HTTP_URL.test(bundleUrl)) throw new Error('bundleUrl must be an http(s) URL');
  if (!SOURCE_MAP_KINDS.includes(request.kind as SourceMapKind)) throw new Error('kind must be a script or a stylesheet');
  const { known } = request;
  if (known === undefined) return;
  if (typeof known !== 'object' || known === null || typeof known.bundleHash !== 'string' || !CONTENT_HASH.test(known.bundleHash)) {
    throw new Error('known.bundleHash must be a content hash');
  }
  if (known.mapUrl !== null && (typeof known.mapUrl !== 'string' || known.mapUrl.length > MAX_URL_CHARS)) throw new Error('known.mapUrl must be a URL or null');
}
