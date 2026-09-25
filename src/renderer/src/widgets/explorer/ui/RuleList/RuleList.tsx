import { AnimatePresence, motion } from 'motion/react';
import { memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { DURATION, EASE_OUT, SLIDE_IN_X } from '@/shared/lib';
import { HoverHighlight } from '@/shared/ui/hover-highlight';
import { selectActivePage, useTabStore } from '@/entities/editor-tab';
import { selectRuleList, useRuleStore } from '@/entities/rule';
import { useResourceFilter } from '@/features/filter-resources';
import { RuleRow } from './RuleRow';

/**
 * The workspace's rules, oldest first (the order they apply in): on/off switches and hit counters.
 * Memoized: the Explorer re-renders as page files arrive, and every render of the list would make
 * Motion measure the layout of its rows.
 */
export const RuleList = memo(function RuleList() {
  const rules = useRuleStore(useShallow(selectRuleList));
  const query = useResourceFilter((s) => s.query.toLowerCase());
  const activeRuleId = useTabStore((s) => {
    const page = selectActivePage(s);
    return page?.page === 'rule' ? page.ruleId : null;
  });
  const visible = rules.filter((r) => !query || r.match.pattern.toLowerCase().includes(query));

  if (!rules.length) {
    return (
      <p className="px-3 pb-2 text-[12px] leading-relaxed text-fg-subtle">
        No rules. Right-click a file to block it or change its headers, or use <span className="text-fg-muted">+</span> for URLs the page fetches.
      </p>
    );
  }
  return (
    <HoverHighlight className="px-1.5 pb-1" role="list" aria-label="Rules">
      <AnimatePresence initial={false}>
        {visible.map((r) => (
          <motion.div
            key={r.id}
            layout="position"
            initial={{ opacity: 0, x: SLIDE_IN_X }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: SLIDE_IN_X }}
            transition={{ duration: DURATION.medium2, ease: EASE_OUT }}
          >
            <RuleRow rule={r} active={r.id === activeRuleId} />
          </motion.div>
        ))}
      </AnimatePresence>
    </HoverHighlight>
  );
});
