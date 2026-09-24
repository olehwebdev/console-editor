import { CDP_WILDCARD } from '../../../shared/matcher';
import type { ResourceKind } from '../../../shared/types';

/** The kind, and CDP resource type, of HTML documents: only document overrides answer them, and SRI is stripped from them. */
export const DOCUMENT_KIND = 'Document' satisfies ResourceKind;

/** The kind, and CDP resource type, of scripts. */
export const SCRIPT_KIND = 'Script' satisfies ResourceKind;

/**
 * The CDP resource type of requests that fit no other. Workers load scripts
 * as it: a worker's first script, a module worker's static imports, and (as
 * their sessions report it) `importScripts`.
 */
export const OTHER_RESOURCE_TYPE = 'Other';

/** A CDP URL pattern matching every request (all `toCdpUrlPattern` can offer a regex). */
export const ANY_URL = CDP_WILDCARD;

