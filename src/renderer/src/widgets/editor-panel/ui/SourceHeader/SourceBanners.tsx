import { AnimatePresence } from 'motion/react';
import { icons } from '@/shared/config';
import { fileName } from '@/shared/lib';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import type { SourceTab } from '@/entities/editor-tab';
import { useSourceMapStore } from '@/entities/source-map';
import { reloadSourceMap } from '@/features/open-resource';
import { Banner } from '../Banners';

/** Hints under an original's header: a map that may not match its bundle, a bundle too large to line up, a large file. */
export function SourceBanners({ tab }: { tab: SourceTab }) {
  const mismatch = useSourceMapStore((s) => {
    const state = s.byBundle[tab.bundleUrl];
    return state?.status === 'ready' && state.mismatch;
  });
  const browseOnly = useSourceMapStore((s) => {
    const state = s.byBundle[tab.bundleUrl];
    return state?.status === 'ready' && state.browseOnly;
  });
  const bundle = fileName(tab.bundleUrl);

  return (
    <AnimatePresence initial={false}>
      {mismatch ? (
        <Banner
          key="mismatch"
          tone="warning"
          icon={icons.WarningIcon}
          action={
            <Button size="sm" variant="secondary" leading={<Icon icon={icons.ReloadIcon} size={14} />} onClick={() => void reloadSourceMap(tab.bundleUrl, tab.bundleKind)}>
              Reload source map
            </Button>
          }
        >
          This source map may not match {bundle}: some of its positions fall outside the file. Jumps may land on the wrong line.
        </Banner>
      ) : null}
      {browseOnly ? (
        <Banner key="browse-only" tone="info" icon={icons.InfoIcon}>
          {bundle} is too large to line up with its source map: you can read its original files, not jump between them and the bundle.
        </Banner>
      ) : null}
      {tab.lite ? (
        <Banner key="lite" tone="info" icon={icons.SparklesIcon}>
          Large file: syntax highlighting only, so scrolling stays fast.
        </Banner>
      ) : null}
    </AnimatePresence>
  );
}
