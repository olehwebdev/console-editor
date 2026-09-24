import type { ResourceKind } from '../../../shared/types';

/** The kind, and CDP resource type, of HTML documents: only document overrides answer them, and SRI is stripped from them. */
export const DOCUMENT_KIND = 'Document' satisfies ResourceKind;
