import type { BrowserInfo } from '@common/types';
import { icons } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';
import { BrowserIcon, useBrowserStore } from '@/entities/browser';
import { matchesTab, stopDriving } from '../model';
import { DrivenTabRow } from './DrivenTabRow';

export interface DrivenSectionProps {
  /** The menu's search, narrowing the tabs. */
  query: string;
  onClose(): void;
}

/** The browsers the app drives with the workspace's changes, each with its tabs (the ones the search finds). */
export function DrivenSection({ query, onClose }: DrivenSectionProps) {
  const driven = useBrowserStore((s) => s.driven);
  const browsers = useBrowserStore((s) => s.browsers);
  if (!driven.length) return null;
  const iconOf = (id: string, name: string): Pick<BrowserInfo, 'icon' | 'name'> => browsers.find((b) => b.id === id) ?? { icon: null, name };

  return (
    <section aria-label="Open with your changes" data-testid="driven-browsers" className="flex max-h-72 flex-col gap-1 overflow-y-auto border-t border-border pt-2">
      {driven.map((browser) => {
        const tabs = browser.tabs.filter((tab) => matchesTab(tab, query));
        return (
          <div key={browser.id} data-testid="driven-browser" data-browser-id={browser.id} className="flex flex-col">
            <div className="flex items-center gap-2 px-2 py-0.5">
              <BrowserIcon browser={iconOf(browser.browserId, browser.name)} size={14} />
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-fg-muted">{browser.name}, with your changes</span>
              <IconButton icon={icons.CloseIcon} label={`Stop serving your changes in ${browser.name}`} size="sm" onClick={() => void stopDriving(browser)} />
            </div>
            {tabs.map((tab) => (
              <DrivenTabRow key={tab.id} browser={browser} tab={tab} onClose={onClose} />
            ))}
            {tabs.length ? null : <p className="px-2 py-1 text-[12px] text-fg-subtle">{browser.tabs.length ? 'No tab matches.' : 'No tabs open.'}</p>}
          </div>
        );
      })}
    </section>
  );
}
