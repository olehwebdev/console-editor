import { stopSourceMapWorker } from '@/shared/lib';
import { useSourceMapStore } from '@/entities/source-map';
import { sourceMapLoads } from './sourceMapLoads';
import { useSourceTree } from './tree';

/** Drops every loaded map (a workspace switch): the store, the tree's state, loads in flight and the worker. Synchronous. */
export function forgetSourceMaps(): void {
  useSourceMapStore.getState().clear();
  sourceMapLoads.loads.clear();
  useSourceTree.getState().reset();
  stopSourceMapWorker();
}
