import type { DrivenBrowser, DrivenTab } from '@common/types';
import { icons } from '@/shared/config';
import { webAddress } from '@/shared/lib';
import { IconButton } from '@/shared/ui/icon-button';
import { activateTab, captureTab, openTabHere } from '../model';
import { TabText } from './TabText';

export interface DrivenTabRowProps {
  browser: DrivenBrowser;
  tab: DrivenTab;
  onClose(): void;
}

/** A tab of a driven browser: choosing it brings it to the front; it can be loaded here, or captured. */
export function DrivenTabRow({ browser, tab, onClose }: DrivenTabRowProps) {
  const onWeb = webAddress(tab.url) !== '';
  return (
    <div data-testid="driven-tab" data-tab-id={tab.id} className="flex items-center gap-1 rounded-lg transition-colors duration-150 hover:bg-hover">
      <button
        type="button"
        onClick={() => {
          onClose();
          void activateTab(browser, tab);
        }}
        className="flex min-w-0 flex-1 flex-col rounded-lg px-2 py-1 text-left outline-none focus-visible:bg-hover"
      >
        <TabText tab={tab} />
      </button>
      <IconButton
        icon={icons.PreviewIcon}
        label="Open it here"
        size="sm"
        disabled={!onWeb}
        onClick={() => {
          onClose();
          void openTabHere(tab);
        }}
      />
      <IconButton icon={icons.CaptureIcon} label="Capture this tab" size="sm" disabled={!onWeb} onClick={() => void captureTab(browser, tab)} data-testid="driven-tab-capture" className="mr-1" />
    </div>
  );
}
