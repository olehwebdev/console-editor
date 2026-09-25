import type { RequestMatch } from '@common/types';
import { fileName } from '@/shared/lib';

/**
 * What a tab or a row calls an override (or a tab not saved yet): the GraphQL operation a response
 * override answers (one `/graphql` URL serves many), else the URL's file name.
 */
export function overrideLabel(url: string, request?: RequestMatch): string {
  return request?.operation || fileName(url);
}
