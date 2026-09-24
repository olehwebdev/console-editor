import { queueIframeDrop } from '../resources/queueIframeDrop';
import { resetResourceOps } from '../resources/resetResourceOps';
import type { AppEventOf } from '../types';

/** A root frame committed a new document: drop what it reported (a cross-site iframe's entries, or everything for the page). */
export function dropNavigatedResources(event: AppEventOf<'navigated'>): void {
  if (event.iframeId) queueIframeDrop(event.iframeId);
  else resetResourceOps();
}
