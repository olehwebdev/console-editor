import { AnimatePresence, motion } from 'motion/react';
import { memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { DURATION, EASE_OUT, fileName } from '@/shared/lib';
import { HoverHighlight } from '@/shared/ui/hover-highlight';
import { selectActiveTab, useTabStore } from '@/entities/editor-tab';
import { selectOverrideList, useOverrideStore } from '@/entities/override';
import { useResourceFilter } from '@/features/filter-resources';
import { OverrideRow } from './OverrideRow';

/**
 * The user's overrides: on/off switches, hit counters, upstream warnings.
 * Memoized: the Explorer re-renders as page files arrive, and every render of
 * the list would make Motion measure the layout of its rows.
 */
export const OverrideList = memo(function OverrideList() {
  const overrides = useOverrideStore(useShallow(selectOverrideList));
  const query = useResourceFilter((s) => s.query.toLowerCase());
  const activeOverrideId = useTabStore((s) => selectActiveTab(s)?.overrideId ?? null);
  const visible = overrides
    .filter((o) => !query || o.sourceUrl.toLowerCase().includes(query) || o.match.pattern.toLowerCase().includes(query))
    .sort((a, b) => fileName(a.sourceUrl).localeCompare(fileName(b.sourceUrl)));

  if (!overrides.length) {
    return (
      <p className="px-3 pb-2 text-[12px] leading-relaxed text-fg-subtle">
        Open a file from the page, edit it and press <span className="text-fg-muted">Ctrl/Cmd+S</span>. Your version is served instead of the live one.
      </p>
    );
  }
  return (
    <HoverHighlight className="px-1.5 pb-1" role="list" aria-label="Overrides">
      <AnimatePresence initial={false}>
        {visible.map((o) => (
          <motion.div
            key={o.id}
            layout="position"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: DURATION.base, ease: EASE_OUT }}
          >
            <OverrideRow override={o} active={o.id === activeOverrideId} />
          </motion.div>
        ))}
      </AnimatePresence>
    </HoverHighlight>
  );
});
