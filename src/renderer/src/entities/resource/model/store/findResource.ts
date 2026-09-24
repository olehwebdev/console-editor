import type { ResourceEntry } from '@common/types';
import { uniqueResources } from './uniqueResources';

export function findResource(byKey: Record<string, ResourceEntry>, url: string): ResourceEntry | undefined {
  return uniqueResources(byKey).find((e) => e.url === url);
}
