import { SHORTCUT } from '@common/constants';
import { icons } from '@/shared/config';
import { fileName } from '@/shared/lib';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { Tooltip } from '@/shared/ui/tooltip';
import type { SourceTab } from '@/entities/editor-tab';
import { cleanLabel, parseSourceUrl, SourceIcon } from '@/entities/source-map';
import { goToBundle, openResource, revealBundleSources } from '@/features/open-resource';
import { Breadcrumbs } from '../Breadcrumbs';
import { SourceBanners } from './SourceBanners';

/** The scheme of a web origin, left out of the breadcrumbs as it is for page files. */
const WEB_SCHEME = /^https?:\/\//;

/** Where an original comes from, that it is read-only, and the way to the bundle code it became. */
export function SourceHeader({ tab, onShowExplorer }: { tab: SourceTab; onShowExplorer(): void }) {
  const { root, dirs, file } = parseSourceUrl(tab.url);
  const bundle = fileName(tab.bundleUrl);

  return (
    <div className="shrink-0 border-b border-line bg-surface-editor" data-testid="source-header">
      <div className="flex h-10 items-center gap-2 px-3">
        <SourceIcon file={file} size={15} />
        <Breadcrumbs root={root.replace(WEB_SCHEME, '')} segments={[...dirs, file]} title={cleanLabel(tab.url)} />
        <Badge icon={icons.LockIcon}>Read-only</Badge>
        <Tooltip content={`Open ${tab.bundleUrl}`}>
          <Button size="sm" variant="ghost" className="hidden max-w-40 sm:inline-flex" onClick={() => void openResource(tab.bundleUrl)}>
            <span className="truncate">from {bundle}</span>
          </Button>
        </Tooltip>
        <IconButton
          icon={icons.SourceRootIcon}
          label="Show in the Explorer"
          onClick={() => {
            void revealBundleSources(tab.bundleUrl, tab.bundleKind);
            onShowExplorer();
          }}
        />
        <Tooltip content="Go to bundle code" shortcut={SHORTCUT.jumpToMapped}>
          <Button
            size="sm"
            variant="secondary"
            leading={<Icon icon={icons.JumpIcon} size={14} />}
            aria-label="Go to bundle code"
            data-testid="go-to-bundle"
            onClick={() => void goToBundle(tab.id)}
          >
            <span className="hidden md:inline">Go to bundle code</span>
          </Button>
        </Tooltip>
      </div>
      <SourceBanners tab={tab} />
    </div>
  );
}
