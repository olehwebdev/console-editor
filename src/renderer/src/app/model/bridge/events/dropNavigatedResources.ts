import { queueIframeDrop } from '../resources/queueIframeDrop';
import { resetResourceOps } from '../resources/resetResourceOps';
import type { AppEventOf } from '../types';

/** A root frame committed a new document: drop what it reported (a cross-site iframe's entries, or for the page everything but service and shared workers' files). */
export function dropNavigatedResources(event: AppEventOf<'navigated'>): void {
  if (event.iframeId) queueIframeDrop(event.iframeId);
  else resetResourceOps();
}
