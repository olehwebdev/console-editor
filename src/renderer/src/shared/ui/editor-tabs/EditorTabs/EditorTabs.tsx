// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useId, useRef, type KeyboardEvent } from 'react';
import { cn } from '@/shared/lib';
import { EditorTab } from './EditorTab';
import { edgeMask } from './edgeMask';
import { handleStripWheel } from './handleStripWheel';
import { handleTabKeyDown } from './handleTabKeyDown';
import { revealTab } from './revealTab';
import type { EditorTabsProps } from './types';
import { useFocusAfterClose } from './useFocusAfterClose';
import { useRevealActive } from './useRevealActive';
import { useScrollEdges } from './useScrollEdges';
import { useTabDrag } from './useTabDrag';

/**
 * Pill-style editor tabs. The active tab is raised (bg-surface-raised +
 * shadow-raised) and its pill glides between tabs with a shared layout;
 * tabs grow in / shrink out as they open and close. Dirty tabs show a dot
 * that swaps with the close button on hover; middle click closes; the strip
 * scrolls horizontally with the wheel. Clicking a tab selects it without
 * taking focus from the editor. Keys: ←/→/Home/End move focus, Enter/Space
 * select, Delete (and Backspace on macOS) close, Alt+Shift+←/→ reorder.
 */
export function EditorTabs({
  items,
  activeId,
  onSelect,
  onClose,
  onReorder,
  renderLabel,
  trailing,
  onTabContextMenu,
  onTabDoubleClick,
  label = 'Open files',
  className,
  onPointerDown,
  ...rest
}: EditorTabsProps) {
  const reduce = useReducedMotion() ?? false;
  const pillId = useId();
  const scrollerRef = useRef<HTMLDivElement>(null);
  useRevealActive(scrollerRef, activeId, reduce);
  const pendingFocus = useFocusAfterClose(scrollerRef, items, activeId);
  const edges = useScrollEdges(scrollerRef);
  const { drag, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useTabDrag(items, onReorder);

  const activeIndex = items.findIndex((item) => item.id === activeId);
  const reveal = (el: HTMLElement | null) => revealTab(scrollerRef.current, el, reduce);
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>, id: string) =>
    handleTabKeyDown(event, id, { scroller: scrollerRef.current, items, onSelect, onClose, onReorder, pendingFocus });
  const mask = edgeMask(edges);

  return (
    <div
      data-slot="editor-tabs"
      className={cn('flex h-9 min-w-0 shrink-0 items-center gap-1 px-1.5', className)}
      onPointerDown={(event) => {
        pendingFocus.current = null;
        onPointerDown?.(event);
      }}
      {...rest}
    >
      <motion.div
        ref={scrollerRef}
        layoutScroll
        role="tablist"
        aria-label={label}
        aria-orientation="horizontal"
        onWheel={handleStripWheel}
        className="flex h-full min-w-0 flex-1 items-center overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        <AnimatePresence initial={false}>
          {items.map((item, index) => (
            <EditorTab
              key={item.id}
              item={item}
              active={item.id === activeId}
              focusable={activeIndex >= 0 ? index === activeIndex : index === 0}
              pillId={pillId}
              reduce={reduce}
              drop={drag && drag.over === item.id ? drag.side : null}
              draggable={!!onReorder}
              renderLabel={renderLabel}
              onSelect={onSelect}
              onClose={onClose}
              onKeyDown={handleKeyDown}
              onReveal={reveal}
              onContextMenu={onTabContextMenu}
              onDoubleClick={onTabDoubleClick}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            />
          ))}
        </AnimatePresence>
      </motion.div>
      {trailing ? <div className="flex shrink-0 items-center gap-0.5">{trailing}</div> : null}
    </div>
  );
}
