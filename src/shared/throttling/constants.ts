import type { Throttling } from '../types';

/** What `Network.emulateNetworkConditions` takes: latency in ms, throughput in bytes a second (-1: no limit). */
export interface NetworkConditions {
  offline: boolean;
  latency: number;
  downloadThroughput: number;
  uploadThroughput: number;
}

/** Bytes a second in a kilobit a second. */
const KBPS = 1000 / 8;

/** Each preset's conditions, as Chrome DevTools names and sets them. */
export const NETWORK_CONDITIONS: Record<Throttling, NetworkConditions> = {
  off: { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 },
  'fast-4g': { offline: false, latency: 165, downloadThroughput: 9000 * KBPS, uploadThroughput: 1500 * KBPS },
  'slow-4g': { offline: false, latency: 563, downloadThroughput: 1600 * KBPS, uploadThroughput: 750 * KBPS },
  '3g': { offline: false, latency: 2000, downloadThroughput: 400 * KBPS, uploadThroughput: 400 * KBPS },
  offline: { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 },
};

/** The network as it is. */
export const NO_THROTTLING = 'off' satisfies Throttling;
