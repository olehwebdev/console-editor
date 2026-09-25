import { toast } from '@/shared/ui/toast';
import { selectActiveSource, selectActiveTab, useTabStore } from '@/entities/editor-tab';
import { isMappableKind } from '@/entities/source-map';
import { goToBundle } from './goToBundle';
import { goToOriginal } from './goToOriginal';

/** The one shortcut for both ways: from an original to its bundle code, or from a bundle to its original. */
export async function jumpToMappedCode(): Promise<void> {
  const state = useTabStore.getState();
  if (selectActiveSource(state)) return goToBundle();
  const tab = selectActiveTab(state);
  if (tab && isMappableKind(tab.kind)) return goToOriginal();
  toast({ title: 'Only scripts and stylesheets have source maps', description: 'Open one, or an original file from the Explorer, to jump between them.', tone: 'neutral' });
}
