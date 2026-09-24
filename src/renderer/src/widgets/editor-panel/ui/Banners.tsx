import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import type { OverrideMeta } from '@common/types';
import { icons } from '@/shared/config';
import { cn, EASE_OUT } from '@/shared/lib';
import { Button } from '@/shared/ui/button';
import { Icon, type IconGlyph } from '@/shared/ui/icon';
import { useOverrideStore } from '@/entities/override';
import { compareWithLive } from '@/features/compare-changes';
import { applyMatch, buildHashGlob } from '@/features/edit-match-rule';

function Banner({ tone, icon, children, action }: { tone: 'info' | 'warning'; icon: IconGlyph; children: ReactNode; action?: ReactNode }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      className="overflow-hidden"
    >
      <div
        className={cn(
          'flex items-center gap-2.5 border-t border-line px-3 py-2 text-[12.5px]',
          tone === 'info' ? 'bg-info/[0.07] text-fg-muted' : 'bg-warning/[0.08] text-fg-muted',
        )}
      >
        <Icon icon={icon} size={15} className={tone === 'info' ? 'text-info' : 'text-warning'} />
        <span className="min-w-0 flex-1">{children}</span>
        {action}
      </div>
    </motion.div>
  );
}

/** Contextual hints under the file header: build-hash names, upstream changes, large files. */
export function Banners({ override, lite, tabId }: { override?: OverrideMeta; lite: boolean; tabId: string }) {
  const changed = useOverrideStore((s) => (override ? !!s.upstreamChanged[override.id] : false));
  const hash = override ? buildHashGlob(override.sourceUrl) : null;
  const showHash = !!override && !!hash && !(override.match.type === 'glob' && override.match.pattern === hash.glob);

  return (
    <AnimatePresence initial={false}>
      {showHash ? (
        <Banner
          key="hash"
          tone="info"
          icon={icons.InfoIcon}
          action={
            <Button size="sm" variant="secondary" onClick={() => void applyMatch(override!.id, { type: 'glob', pattern: hash!.glob, ignoreQuery: true })}>
              Match every build ({hash!.label})
            </Button>
          }
        >
          This file name has a build hash, so the override stops matching after the next deploy.
        </Banner>
      ) : null}
      {changed ? (
        <Banner
          key="changed"
          tone="warning"
          icon={icons.WarningIcon}
          action={
            <Button size="sm" variant="secondary" leading={<Icon icon={icons.DiffIcon} size={14} />} onClick={() => void compareWithLive(tabId)}>
              Compare live
            </Button>
          }
        >
          The live file changed since you created this override (new deploy?). Your version still replaces it.
        </Banner>
      ) : null}
      {lite ? (
        <Banner key="lite" tone="info" icon={icons.SparklesIcon}>
          Large file: syntax highlighting only, so editing stays fast. Error checking is off for this tab.
        </Banner>
      ) : null}
    </AnimatePresence>
  );
}
