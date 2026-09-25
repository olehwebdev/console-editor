import { icons } from '@/shared/config';
import { fileName } from '@/shared/lib';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/ui/icon';
import type { SourceTab } from '@/entities/editor-tab';
import { cleanLabel, parseSourceUrl } from '@/entities/source-map';
import { goToBundle } from '@/features/open-resource';

/** An original whose map lists it without its text: say so, and offer its code in the bundle. */
export function SourceMissing({ tab }: { tab: SourceTab }) {
  const { dirs, file } = parseSourceUrl(tab.url);
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-surface-editor" data-testid="source-missing">
      <EmptyState
        icon={icons.SourceFileIcon}
        title="Not in the source map"
        actions={
          <>
            <Button size="sm" variant="secondary" leading={<Icon icon={icons.JumpIcon} size={14} />} onClick={() => void goToBundle(tab.id, 1)}>
              Go to its code in the bundle
            </Button>
            <Button size="sm" variant="ghost" leading={<Icon icon={icons.CopyIcon} size={14} />} onClick={() => void navigator.clipboard.writeText(tab.url)}>
              Copy path
            </Button>
          </>
        }
      >
        The source map of {fileName(tab.bundleUrl)} lists <span className="text-fg">{[...dirs, file].join('/') || cleanLabel(tab.url)}</span> without its text.
      </EmptyState>
    </div>
  );
}
