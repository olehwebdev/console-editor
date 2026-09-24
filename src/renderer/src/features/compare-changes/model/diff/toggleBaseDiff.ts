import { useTabStore } from '@/entities/editor-tab';
import { closeDiff } from './closeDiff';
import { showBaseDiff } from './showBaseDiff';

export function toggleBaseDiff(): void {
  if (useTabStore.getState().diff !== 'off') closeDiff();
  else void showBaseDiff();
}
