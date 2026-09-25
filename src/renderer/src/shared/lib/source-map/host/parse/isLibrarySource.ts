import { NODE_MODULES_SEGMENT } from '../../constants';

/** Third-party code a map lists without ignore-listing it. */
export function isLibrarySource(url: string): boolean {
  return url.includes(NODE_MODULES_SEGMENT);
}
