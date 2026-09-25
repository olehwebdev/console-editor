import { ID_SEPARATOR } from '../../model/constants';

/** The id of the row holding this one ('' for the root's children, undefined for the root). */
export function parentId(id: string): string | undefined {
  return id ? id.slice(0, id.lastIndexOf(ID_SEPARATOR)) : undefined;
}
