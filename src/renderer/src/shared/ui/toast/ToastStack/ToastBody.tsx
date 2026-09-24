// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { AlertCircleIcon } from '@hugeicons/core-free-icons';
import { motion } from 'motion/react';
import type { RefObject } from 'react';
import { CloseIcon, InfoIcon, SuccessIcon, WarningIcon } from '@/shared/config/icons';
import { cn, DURATION, EASE_OUT } from '@/shared/lib';
import { Icon, type IconGlyph } from '@/shared/ui/icon';
import type { ToastRecord, ToastTone } from '../store';
import { actionsGoBelow } from './actionsGoBelow';
import { clickedByKeyboard } from './clickedByKeyboard';
import { ToastActions } from './ToastActions';

const TONE_ICON: Record<ToastTone, IconGlyph> = {
  neutral: InfoIcon,
  success: SuccessIcon,
  warning: WarningIcon,
  danger: AlertCircleIcon,
};

const TONE_CLASS: Record<ToastTone, string> = {
  neutral: 'text-fg-muted',
  success: 'text-live',
  warning: 'text-warning',
  danger: 'text-danger',
};

interface ToastBodyProps {
  toast: ToastRecord;
  stacked: boolean;
  hidden: boolean;
  /** The content box, whose height is the card's natural height. */
  contentRef: RefObject<HTMLDivElement | null>;
  onDismiss: (viaKeyboard: boolean) => void;
}

/** A card's content: tone icon, text, actions and the dismiss button. Hidden (and inert) while stacked. */
export function ToastBody({ toast: t, stacked, hidden, contentRef, onDismiss }: ToastBodyProps) {
  const actionsBelow = actionsGoBelow(t);
  const actions = <ToastActions toast={t} onDismiss={onDismiss} />;

  return (
    <motion.div
      ref={contentRef}
      initial={false}
      animate={{ opacity: stacked ? 0 : 1 }}
      transition={{ duration: DURATION.medium1, ease: EASE_OUT }}
      inert={stacked || hidden}
      className="relative flex items-start gap-2.5 px-3 py-2.5"
    >
      <Icon icon={TONE_ICON[t.tone]} size={16} className={cn('mt-0.5', TONE_CLASS[t.tone])} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium leading-5 text-fg">{t.title}</p>
        {t.description ? <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-fg-muted">{t.description}</p> : null}
        {actionsBelow ? <div className="-mr-6 mt-2 flex justify-end gap-1">{actions}</div> : null}
      </div>
      {actionsBelow ? null : actions}
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={(event) => onDismiss(clickedByKeyboard(event))}
        className={cn(
          '-mr-1 grid size-5 shrink-0 place-items-center rounded-md text-fg-subtle opacity-0 transition-opacity duration-150 hover:bg-hover hover:text-fg focus-visible:opacity-100 group-hover:opacity-100',
          actionsBelow ? 'self-start' : 'self-center',
        )}
      >
        <Icon icon={CloseIcon} size={14} />
      </button>
    </motion.div>
  );
}
