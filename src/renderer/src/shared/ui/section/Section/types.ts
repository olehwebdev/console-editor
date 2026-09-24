import type { ComponentPropsWithRef, ReactNode } from 'react';

export type SectionCountTone = 'neutral' | 'accent' | 'live';

export interface SectionProps extends Omit<ComponentPropsWithRef<'section'>, 'title'> {
  /** Caps header label (EXPLORER, OVERRIDES…). */
  title: ReactNode;
  /** Small count pill after the title. */
  count?: number;
  countTone?: SectionCountTone;
  /** Header actions (small IconButtons). Shown on header hover / focus unless `actionsVisible="always"`. */
  actions?: ReactNode;
  actionsVisible?: 'hover' | 'always';
  /** Uncontrolled initial state (default true). */
  defaultOpen?: boolean;
  /** Controlled state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Header sticks to the top of the scrolling ancestor (gets a `bg-surface` backdrop; override via `headerClassName`). */
  sticky?: boolean;
  /** `false` renders a static header with the body always shown. */
  collapsible?: boolean;
  /** Keep the body mounted while collapsed. */
  keepMounted?: boolean;
  headerClassName?: string;
  /** Classes for the animated body (e.g. `min-h-0 flex-1` for a body that fills a flex column). */
  contentClassName?: string;
}

export type CollapsibleProps = SectionProps;
