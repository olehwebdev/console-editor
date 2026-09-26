import { stopSourceMapWorker } from '@/shared/lib';
import { useInspectorStore } from '@/entities/inspector';
import { useSourceMapStore } from '@/entities/source-map';
import { originLookups } from './originLookups';
import { sourceMapLoads } from './sourceMapLoads';
import { useSourceTree } from './tree';

/**
 * Drops every loaded map (a workspace switch): the store, the tree's state, loads in flight and the worker,
 * and what the maps said (the originals and hook names found, those being looked up). Synchronous.
 */
export function forgetSourceMaps(): void {
  useSourceMapStore.getState().clear();
  sourceMapLoads.loads.clear();
  sourceMapLoads.reloads.clear();
  originLookups.generation += 1;
  originLookups.inFlight.clear();
  originLookups.found.clear();
  useInspectorStore.getState().forgetOrigins();
  useSourceTree.getState().reset();
  stopSourceMapWorker();
}
