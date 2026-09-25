import { AnimatePresence } from 'motion/react';
import type { OverrideMeta } from '@common/types';
import { icons } from '@/shared/config';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import type { TabMeta } from '@/entities/editor-tab';
import { useOverrideStore } from '@/entities/override';
import { usePageStore } from '@/entities/page';
import { blockingRuleFor, useRuleStore } from '@/entities/rule';
import { compareWithLive } from '@/features/compare-changes';
import { applyMatch, buildHashGlob } from '@/features/edit-match-rule';
import { openRuleEditor } from '@/features/rule/edit';
import { setRuleEnabled } from '@/features/rule/toggle';
import { isPageDocument } from '../../lib/isPageDocument';
import { Banner } from './Banner';

/** Contextual hints under the file header: a rule blocking the file, build-hash names, upstream changes, large files. */
export function Banners({ override, tab }: { override?: OverrideMeta; tab: TabMeta }) {
  const changed = useOverrideStore((s) => (override ? !!s.upstreamChanged[override.id] : false));
  // The page's own document is never blocked, whatever the rules say.
  const isPage = usePageStore((s) => isPageDocument(tab, s.page.url));
  const blocking = useRuleStore((s) => (isPage ? undefined : blockingRuleFor(s.byId, tab.url, tab.kind)));
  const hash = override ? buildHashGlob(override.sourceUrl) : null;
  const showHash = !!override && !!hash && !(override.match.type === 'glob' && override.match.pattern === hash.glob);

  return (
    <AnimatePresence initial={false}>
      {blocking ? (
        <Banner
          key="blocked"
          tone="danger"
          icon={icons.BlockIcon}
          data-testid="blocked-banner"
          action={
            <span className="flex items-center gap-1.5">
              <Button size="sm" variant="secondary" onClick={() => void setRuleEnabled(blocking.id, false)}>
                Turn rule off
              </Button>
              <Button size="sm" variant="ghost" onClick={() => openRuleEditor(blocking)}>
                Open rule
              </Button>
            </span>
          }
        >
          A rule blocks this file: the page never loads it{override ? ", so this override isn't served" : ''}.
        </Banner>
      ) : null}
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
            <Button size="sm" variant="secondary" leading={<Icon icon={icons.DiffIcon} size={14} />} onClick={() => void compareWithLive(tab.id)}>
              Compare live
            </Button>
          }
        >
          The live file changed since you created this override (new deploy?). Your version still replaces it.
        </Banner>
      ) : null}
      {tab.lite ? (
        <Banner key="lite" tone="info" icon={icons.SparklesIcon}>
          Large file: syntax highlighting only, so editing stays fast. Error checking is off for this tab.
        </Banner>
      ) : null}
    </AnimatePresence>
  );
}
