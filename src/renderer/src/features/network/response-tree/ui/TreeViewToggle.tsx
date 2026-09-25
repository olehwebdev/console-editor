import { icons } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';
import { useResponseViews } from '../model';

// Actions never change, so they are read once instead of subscribed to.
const { toggle } = useResponseViews.getState();

/** Shows a response tab's JSON as a tree to browse and edit, or as the text again. */
export function TreeViewToggle({ tabId }: { tabId: string }) {
  const tree = useResponseViews((s) => !!s.tree[tabId]);
  return <IconButton icon={icons.TreeViewIcon} label={tree ? 'Show the text' : 'Show as a tree'} active={tree} aria-pressed={tree} data-testid="response-tree-toggle" onClick={() => toggle(tabId)} />;
}
