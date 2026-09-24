// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { motion } from 'motion/react';
import { cn } from '@/shared/lib';
import { Icon, isGlyph } from '@/shared/ui/icon';
import { CONTENT, FADE, INSTANT } from './constants';
import type { EditorTabItem, EditorTabsProps, EditorTabTone } from './types';

const TONE: Record<EditorTabTone, string> = {
  neutral: '',
  accent: 'text-accent',
  live: 'text-live',
  info: 'text-info',
  warning: 'text-warning',
  danger: 'text-danger',
  js: 'text-kind-js',
  css: 'text-kind-css',
  html: 'text-kind-html',
};

interface TabLabelProps {
  item: EditorTabItem;
  active: boolean;
  reduce: boolean;
  renderLabel?: EditorTabsProps['renderLabel'];
}

/** The tab's icon and label, fading in and out with the tab. */
export function TabLabel({ item, active, reduce, renderLabel }: TabLabelProps) {
  return (
    <motion.span variants={CONTENT} transition={reduce ? INSTANT : FADE} className="relative flex min-w-0 items-center gap-1.5">
      {item.icon ? (
        <span aria-hidden className={cn('grid size-4 shrink-0 place-items-center', item.tone && TONE[item.tone])}>
          {isGlyph(item.icon) ? <Icon icon={item.icon} size={14} /> : item.icon}
        </span>
      ) : null}
      <span className={cn('min-w-0 truncate', item.italic && 'italic')}>{renderLabel ? renderLabel(item, { active }) : item.label}</span>
    </motion.span>
  );
}
