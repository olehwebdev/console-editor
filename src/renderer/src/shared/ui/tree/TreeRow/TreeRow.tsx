// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { KeyboardEvent } from 'react';
import { cn } from '@/shared/lib';
import { HOVER_ROW_ATTR, useInHoverHighlight } from '@/shared/ui/hover-highlight';
import { Icon, isGlyph } from '@/shared/ui/icon';
import { PAD, TREE_INDENT } from './constants';
import { TreeGuides } from './TreeGuides';
import { TREE_ROW_KEY_HANDLERS } from './treeRowKeyHandlers';
import { TreeTwistie } from './TreeTwistie';
import type { TreeRowProps } from './types';

/**
 * One 26 px row of a tree the caller renders (flat or virtualized). Indents
 * 12 px per level with faint guide lines, rotates its chevron with a spring,
 * marks selection with an accent tint and a 2 px accent bar. Opts into
 * <HoverHighlight> and implements the WAI-ARIA tree keys: ↑/↓/Home/End move
 * focus between rendered rows, →/← expand/collapse or step to child/parent,
 * Enter/Space click. Handle `onKeyDown` and `preventDefault()` to override:
 * virtualized trees move focus with `treeKeyTarget` over their row model and
 * pass `aria-setsize`/`aria-posinset` from `treePositions`.
 */
export function TreeRow({
  depth,
  expanded,
  onToggle,
  selected = false,
  icon,
  iconClassName,
  label,
  meta,
  trailing,
  guides = true,
  className,
  style,
  tabIndex,
  onClick,
  onKeyDown,
  ...rest
}: TreeRowProps) {
  const highlighted = useInHoverHighlight();
  const isFolder = expanded !== undefined;
  const handleClick = onClick ?? (isFolder && onToggle ? () => onToggle() : undefined);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.target !== event.currentTarget) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (!Object.hasOwn(TREE_ROW_KEY_HANDLERS, event.key)) return;
    const handled = TREE_ROW_KEY_HANDLERS[event.key]({ row: event.currentTarget, expanded, onToggle, repeat: event.repeat });
    if (handled === false) return;
    event.preventDefault();
  };

  return (
    <div
      role="treeitem"
      aria-level={depth + 1}
      aria-expanded={isFolder ? expanded : undefined}
      aria-selected={selected}
      tabIndex={tabIndex ?? (selected ? 0 : -1)}
      data-selected={selected || undefined}
      {...{ [HOVER_ROW_ATTR]: '' }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'group/tree-row relative flex h-[26px] cursor-default select-none items-center gap-1.5 rounded-md pr-2 text-[13px] text-fg-muted outline-none',
        'transition-colors duration-150 ease-out-expo hover:text-fg',
        'focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent/60',
        !highlighted && 'hover:bg-hover',
        selected && 'bg-accent/10 text-fg',
        className,
      )}
      style={{ paddingLeft: PAD + depth * TREE_INDENT, ...style }}
      {...rest}
    >
      {guides && depth > 0 ? <TreeGuides depth={depth} /> : null}

      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-[5px] left-0 w-0.5 rounded-full bg-accent',
          'transition-[scale,opacity] duration-200 ease-out-expo',
          selected ? 'scale-y-100 opacity-100' : 'scale-y-50 opacity-0',
        )}
      />

      <TreeTwistie expanded={expanded} onToggle={onToggle} />

      {icon ? (
        <span aria-hidden className="grid size-4 shrink-0 place-items-center">
          {isGlyph(icon) ? <Icon icon={icon} size={14} className={iconClassName} /> : icon}
        </span>
      ) : null}

      <span data-tree-label="" className="min-w-0 flex-1 truncate">
        {label}
      </span>

      {meta !== undefined && meta !== null && meta !== false ? (
        <span className="shrink-0 pl-1 text-[11px] tabular-nums text-fg-subtle">{meta}</span>
      ) : null}
      {trailing ? <span className="flex shrink-0 items-center">{trailing}</span> : null}
    </div>
  );
}
