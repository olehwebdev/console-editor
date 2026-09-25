import { SHORTCUT } from '@common/constants';
import { icons } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';
import { usePageStore } from '@/entities/page';
import { goBack, goForward, openPageDevTools, reloadPage } from '@/features/navigate-page';
import { AddressBar } from '../AddressBar';
import { MOVE_BUTTON } from './constants';
import { PickButton } from './PickButton';
import type { PagePreviewProps, PreviewPlacement } from './types';

export interface PreviewToolbarProps extends Pick<PagePreviewProps, 'addressBarRef'> {
  hasPage: boolean;
  placement: PreviewPlacement;
}

/**
 * The preview's navigation bar: back, forward, reload (spinning while the page loads), the address, the
 * page's DevTools, picking an element (in the editor, which shows what was picked), and moving the website to its own
 * window or back.
 */
export function PreviewToolbar({ hasPage, placement, addressBarRef }: PreviewToolbarProps) {
  const move = MOVE_BUTTON[placement];
  const canGoBack = usePageStore((s) => s.page.canGoBack);
  const canGoForward = usePageStore((s) => s.page.canGoForward);
  const loading = usePageStore((s) => s.page.loading);

  return (
    <header className="flex h-10 shrink-0 items-center gap-1 border-b border-line px-2">
      <IconButton icon={icons.BackIcon} label="Back" size="sm" disabled={!canGoBack} onClick={() => void goBack()} />
      <IconButton icon={icons.ForwardIcon} label="Forward" size="sm" disabled={!canGoForward} onClick={() => void goForward()} />
      <IconButton
        icon={icons.ReloadIcon}
        label="Reload page"
        shortcut={SHORTCUT.reload}
        size="sm"
        disabled={!hasPage}
        onClick={() => void reloadPage()}
        className={loading ? '[&_svg]:animate-spin-slow' : undefined}
      />
      <AddressBar inputRef={addressBarRef} className="mx-1" />
      {placement === 'editor' ? <PickButton disabled={!hasPage} /> : null}
      <IconButton icon={icons.DevToolsIcon} label="DevTools for the page" shortcut={SHORTCUT.pageDevTools} size="sm" disabled={!hasPage} onClick={() => void openPageDevTools()} />
      <IconButton icon={move.icon} label={move.label} size="sm" onClick={() => void move.move()} />
    </header>
  );
}
