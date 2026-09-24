export {
  useResourceStore,
  resourceKey,
  uniqueResources,
  findResource,
  selectUniqueResources,
  selectResourceCount,
  selectIframeCount,
  type ResourceOp,
} from './model/store';
export { buildResourceRows, describeFrame, matchesQuery, type ResourceRow } from './lib/tree';
export { KindIcon, KIND_NAME } from './ui/KindIcon';
