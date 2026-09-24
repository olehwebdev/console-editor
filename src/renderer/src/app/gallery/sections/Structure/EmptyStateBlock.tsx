import { useState } from 'react';
import { icons } from '@/shared/config';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/ui/icon';
import { Kbd } from '@/shared/ui/kbd';
import { Block } from '../../Block';
import { ICON_SIZE } from './constants';

const { ExplorerIcon, PreviewIcon, ReloadIcon, SparklesIcon } = icons;

/** In Kbd's notation (`mod` is ⌘ on macOS, Ctrl elsewhere). */
const PALETTE_SHORTCUT = ['mod', 'K'];

export function EmptyStateBlock() {
  const [replay, setReplay] = useState(0);
  return (
    <Block title="EmptyState" hint="fade-up stagger on mount (md for panes, sm for sidebars)">
      <div className="flex flex-wrap items-stretch gap-4">
        <div key={`md-${replay}`} className="flex min-h-64 flex-1 items-center justify-center rounded-lg border border-line bg-surface-editor py-8">
          <EmptyState
            icon={SparklesIcon}
            title="Patch a live website without rebuilding it"
            actions={
              <>
                <Button variant="primary" leading={<Icon icon={PreviewIcon} size={ICON_SIZE} />}>
                  Open a page
                </Button>
                <Button variant="ghost" trailing={<Kbd keys={PALETTE_SHORTCUT} />}>
                  Commands
                </Button>
              </>
            }
          >
            Pick a script or stylesheet from the page, edit it and save: the page reloads running your version.
          </EmptyState>
        </div>
        <div key={`sm-${replay}`} className="flex w-[260px] items-center rounded-lg border border-line bg-surface py-8">
          <EmptyState icon={ExplorerIcon} title="No files yet" size="sm">
            Scripts, stylesheets and HTML the page loads show up here.
          </EmptyState>
        </div>
      </div>
      <div>
        <Button size="sm" variant="ghost" leading={<Icon icon={ReloadIcon} size={ICON_SIZE} />} onClick={() => setReplay((n) => n + 1)}>
          Replay entrance
        </Button>
      </div>
    </Block>
  );
}
