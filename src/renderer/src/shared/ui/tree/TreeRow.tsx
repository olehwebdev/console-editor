// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { motion, useReducedMotion } from 'motion/react';
import type { ComponentPropsWithRef, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { icons } from '@/shared/config';
import { cn, SPRING_SWAP } from '@/shared/lib';
import { HOVER_ROW_ATTR, useInHoverHighlight } from '@/shared/ui/hover-highlight';
import { Icon, type IconGlyph } from '@/shared/ui/icon';

/** Row height (px): 26, per the design system. Use it as the virtualizer's estimateSize. */
export const TREE_ROW_HEIGHT = 26;
/** Indentation per depth level (px). */
export const TREE_INDENT = 12;
/** Left padding before the depth-0 chevron (px). */
const PAD = 6;
/** Chevron cell width (px); guides sit under the ancestor chevrons' centers. */
const TWISTIE = 16;

export interface TreeRowProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** 0-based nesting level. */
  depth: number;
  /** `true` / `false` for folders (renders the chevron); `undefined` for leaves. */
  expanded?: boolean;
  /** Chevron click, ArrowRight on a collapsed row, ArrowLeft on an expanded one. */
  onToggle?: () => void;
  selected?: boolean;
  /** A Hugeicons glyph (drawn at 14 px) or any node (e.g. a tinted kind icon). */
  icon?: IconGlyph | ReactNode;
  /** Classes for the glyph when `icon` is a glyph, e.g. `text-kind-js`. */
  iconClassName?: string;
  /** Usually text or a <TreeLabel>. Carries `data-tree-label` for styling hooks. */
  label: ReactNode;
  /** Quiet right-aligned detail (count, size), before `trailing`. */
  meta?: ReactNode;
  /** Right-edge slot: status dots, badges, hover actions (`group-hover/tree-row:opacity-100`). */
  trailing?: ReactNode;
  /** Draw the faint vertical indent guides (default true). */
  guides?: boolean;
}

function isGlyph(value: unknown): value is IconGlyph {
  return Array.isArray(value) && value.length > 0 && Array.isArray(value[0]) && typeof value[0][0] === 'string';
}

function treeRows(row: HTMLElement): HTMLElement[] {
  const tree = row.closest<HTMLElement>('[role="tree"]') ?? row.parentElement;
  if (!tree) return [row];
  return Array.from(tree.querySelectorAll<HTMLElement>('[role="treeitem"]')).filter(
    (el) => el.closest('[role="tree"]') === row.closest('[role="tree"]'),
  );
}

const levelOf = (el: HTMLElement) => Number(el.getAttribute('aria-level') ?? '1');

/**
 * One 26 px row of a tree the caller renders (flat or virtualized). Indents
 * 12 px per level with faint guide lines, rotates its chevron with a spring,
 * marks selection with an accent tint and a 2 px accent bar. Opts into
 * <HoverHighlight> and implements the WAI-ARIA tree keys: ↑/↓/Home/End move
 * focus between rendered rows, →/← expand/collapse or step to child/parent,
 * Enter/Space click. Handle `onKeyDown` and `preventDefault()` to override.
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
  const reduce = useReducedMotion();
  const highlighted = useInHoverHighlight();
  const isFolder = expanded !== undefined;
  const handleClick = onClick ?? (isFolder && onToggle ? () => onToggle() : undefined);

  const focusRow = (from: HTMLElement, pick: (rows: HTMLElement[], index: number) => HTMLElement | undefined) => {
    const rows = treeRows(from);
    const target = pick(rows, rows.indexOf(from));
    target?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.target !== event.currentTarget) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const row = event.currentTarget;
    switch (event.key) {
      case 'ArrowDown':
        focusRow(row, (rows, i) => rows[i + 1]);
        break;
      case 'ArrowUp':
        focusRow(row, (rows, i) => rows[i - 1]);
        break;
      case 'Home':
        focusRow(row, (rows) => rows[0]);
        break;
      case 'End':
        focusRow(row, (rows) => rows[rows.length - 1]);
        break;
      case 'ArrowRight':
        if (expanded === false) onToggle?.();
        else if (expanded === true) focusRow(row, (rows, i) => (rows[i + 1] && levelOf(rows[i + 1]) > levelOf(row) ? rows[i + 1] : undefined));
        else return;
        break;
      case 'ArrowLeft':
        if (expanded === true && onToggle) onToggle();
        else
          focusRow(row, (rows, i) => {
            const level = levelOf(row);
            for (let j = i - 1; j >= 0; j--) if (levelOf(rows[j]) < level) return rows[j];
            return undefined;
          });
        break;
      case 'Enter':
      case ' ':
        if (event.repeat) break;
        row.click();
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const handleToggle = (event: MouseEvent) => {
    if (!onToggle) return;
    event.stopPropagation();
    onToggle();
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
      {guides && depth > 0
        ? Array.from({ length: depth }, (_, level) => (
            <span
              key={level}
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-px bg-line"
              style={{ left: PAD + level * TREE_INDENT + TWISTIE / 2 - 1 }}
            />
          ))
        : null}

      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-[5px] left-0 w-0.5 rounded-full bg-accent',
          'transition-[scale,opacity] duration-200 ease-out-expo',
          selected ? 'scale-y-100 opacity-100' : 'scale-y-50 opacity-0',
        )}
      />

      {isFolder ? (
        <span
          aria-hidden
          onClick={handleToggle}
          className="-mr-0.5 grid size-4 shrink-0 place-items-center text-fg-subtle transition-colors group-hover/tree-row:text-fg-muted"
        >
          <motion.span
            className="grid place-items-center"
            initial={false}
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={reduce ? { duration: 0 } : SPRING_SWAP}
          >
            <Icon icon={icons.ChevronRightIcon} size={12} strokeWidth={2} />
          </motion.span>
        </span>
      ) : (
        <span aria-hidden className="-mr-0.5 size-4 shrink-0" />
      )}

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
