import { useTreeStore } from '@/entities/inspector';
import type { AppEventOf } from '../types';
import { dropNavigatedResources } from './dropNavigatedResources';

/** A root frame committed a new document: what it reported goes, and the Components tree is read afresh. */
export function followNavigation(event: AppEventOf<'navigated'>): void {
  dropNavigatedResources(event);
  useTreeStore.getState().setFrame(null);
}
