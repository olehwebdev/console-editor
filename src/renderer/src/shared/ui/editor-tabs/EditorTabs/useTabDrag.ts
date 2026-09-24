// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { useState, type DragEvent } from 'react';
import { reorderTabs } from './reorderTabs';
import type { DropSide, EditorTabItem, EditorTabsProps, TabDrag } from './types';

/**
 * Private drag payload. Never `text/plain`: Monaco's drop-into-editor and every
 * text input accept plain text, so releasing a tab over them would insert its id.
 */
const TAB_MIME = 'application/x-console-editor-tab';

/** Drag-and-drop reordering: the drag in progress and the tab handlers that track it. */
export function useTabDrag(items: readonly EditorTabItem[], onReorder: EditorTabsProps['onReorder']) {
  const [drag, setDrag] = useState<TabDrag | null>(null);

  const handleDragStart = (event: DragEvent<HTMLDivElement>, id: string) => {
    if (!onReorder) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(TAB_MIME, id);
    setDrag({ id, over: null, side: 'before' });
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>, id: string) => {
    if (!drag || !event.dataTransfer.types.includes(TAB_MIME)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const box = event.currentTarget.getBoundingClientRect();
    const side: DropSide = event.clientX < box.left + box.width / 2 ? 'before' : 'after';
    const over = id === drag.id ? null : id;
    if (drag.over !== over || drag.side !== side) setDrag({ ...drag, over, side });
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!drag) return;
    event.preventDefault();
    if (drag.over) reorderTabs(items, onReorder, drag.id, drag.over, drag.side);
    setDrag(null);
  };

  const handleDragEnd = () => setDrag(null);

  return { drag, handleDragStart, handleDragOver, handleDrop, handleDragEnd };
}
