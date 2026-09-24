import { entriesPreview } from './entriesPreview';
import { listPreview } from './listPreview';
import { objectPreview } from './objectPreview';
import type { ObjectPreview } from './types';

/** Subtypes previewed as a list of items or as key/value entries; anything else as an object. */
const PREVIEW_BY_SUBTYPE: Readonly<Record<string, (preview: ObjectPreview) => string>> = {
  array: listPreview,
  typedarray: listPreview,
  map: entriesPreview,
  set: entriesPreview,
  weakmap: entriesPreview,
  weakset: entriesPreview,
};

/** An object's one-line preview, shaped by what it is. */
export function previewText(preview: ObjectPreview): string {
  const subtype = preview.subtype ?? '';
  return (Object.hasOwn(PREVIEW_BY_SUBTYPE, subtype) ? PREVIEW_BY_SUBTYPE[subtype]! : objectPreview)(preview);
}
