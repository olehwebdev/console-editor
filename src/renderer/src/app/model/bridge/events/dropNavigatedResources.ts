import { useSourceMapStore } from '@/entities/source-map';
import { queueIframeDrop } from '../resources/queueIframeDrop';
import { resetResourceOps } from '../resources/resetResourceOps';
import type { AppEventOf } from '../types';

/**
 * A root frame committed a new document: drop what it reported (a cross-site iframe's entries, or for
 * the page everything but service and shared workers' files). Loaded source maps stay, but are checked
 * against their bundles again on next use: the page may have loaded a new build.
 */
export function dropNavigatedResources(event: AppEventOf<'navigated'>): void {
  if (event.iframeId) return queueIframeDrop(event.iframeId);
  resetResourceOps();
  useSourceMapStore.getState().nextGeneration();
}
