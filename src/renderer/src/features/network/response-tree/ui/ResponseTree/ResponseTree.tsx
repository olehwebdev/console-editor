import { Button } from '@/shared/ui/button';
import { useResponseViews, useTabJson } from '../../model';
import { TreeList } from './TreeList';

// Actions never change, so they are read once instead of subscribed to.
const { toggle } = useResponseViews.getState();

/**
 * A response tab's JSON as a tree, over its text: values to browse, edit in place, null, add or
 * remove. Each change is an undoable edit of the text (the rest as typed), so saving works as ever.
 */
export function ResponseTree({ tabId }: { tabId: string }) {
  const json = useTabJson(tabId);
  return (
    <div className="flex h-full flex-col bg-surface-editor" data-testid="response-tree-view">
      {json.root ? (
        <TreeList key={tabId} tabId={tabId} root={json.root} text={json.text} />
      ) : (
        <div className="flex flex-col items-start gap-2 p-4 text-[12.5px]">
          <p className="text-fg">The text isn’t JSON, so it can’t show as a tree.</p>
          <p className="font-mono text-[12px] text-danger">{json.error}</p>
          <Button size="sm" variant="secondary" onClick={() => toggle(tabId)}>
            Show the text
          </Button>
        </div>
      )}
    </div>
  );
}
