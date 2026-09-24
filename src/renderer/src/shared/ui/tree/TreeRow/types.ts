// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { IconGlyph } from '@/shared/ui/icon';

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

/** A key pressed on a focused row. */
export interface TreeRowKeyContext {
  row: HTMLElement;
  /** The row's `expanded` prop: `undefined` for a leaf. */
  expanded: boolean | undefined;
  onToggle: (() => void) | undefined;
  /** The key is held down (auto-repeat). */
  repeat: boolean;
}

/** Returns `false` when the key does nothing on this row, so its default action runs. */
export type TreeRowKeyHandler = (key: TreeRowKeyContext) => false | void;
