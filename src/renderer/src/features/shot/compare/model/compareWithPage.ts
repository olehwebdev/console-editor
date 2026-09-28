import type { Shot } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { openCompare } from './openCompare';

/** Captures the whole page laid out at a shot's width and scale (a design's), and compares the two. */
export async function compareWithPage(shot: Shot): Promise<void> {
  try {
    openCompare(shot, await api.captureForDesign(shot.id));
  } catch (err) {
    toast({ title: 'Could not capture the page to compare', description: errorMessage(err), tone: 'danger' });
  }
}
