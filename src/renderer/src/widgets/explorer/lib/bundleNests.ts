import { fileName } from '@/shared/lib';
import { describeFailure, type SourceMapState } from '@/entities/source-map';
import type { BundleNest } from './types';

const BASE: BundleNest = { status: 'unknown', count: null, failure: null, mapUrl: null, file: null };

/** What a bundle row shows of each state of its map; null when it has no nest (no map). A new status fails typecheck until it's decided here. */
export const BUNDLE_NESTS: { [S in SourceMapState['status']]: (state: Extract<SourceMapState, { status: S }>, bundleUrl: string) => BundleNest | null } = {
  loading: () => ({ ...BASE, status: 'loading' }),
  none: () => null,
  failed: ({ failure, detail, mapUrl }, bundleUrl) => ({ ...BASE, status: 'failed', failure: describeFailure(failure, detail, fileName(bundleUrl)), mapUrl }),
  ready: ({ sources, mapUrl, file }) => ({ ...BASE, status: 'ready', count: sources.length, mapUrl, file: file ?? null }),
};

/** A bundle not asked about yet, or no longer held. */
export const UNKNOWN_NEST = BASE;
