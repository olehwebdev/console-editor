import { icons } from '@/shared/config';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { useBrowserStore } from '@/entities/browser';
import { loadEverydayTabs, matchesTab, openTabHere } from '../model';
import { TabText } from './TabText';

export interface EverydaySectionProps {
  /** The menu's search, narrowing the tabs. */
  query: string;
  onClose(): void;
}

/**
 * Your everyday browsers' tabs, to load one here: Firefox's profile by profile, from its session files, and on macOS
 * those of your running Safari, Chrome, Edge, Brave, Arc or Vivaldi, through scripting. Read only once asked (the
 * button), then again each time the menu opens.
 */
export function EverydaySection({ query, onClose }: EverydaySectionProps) {
  const everyday = useBrowserStore((s) => s.everyday);
  const listsTabs = useBrowserStore((s) => s.browsers.some((b) => b.listsTabs));
  if (!everyday) {
    if (!listsTabs) return null;
    return (
      <Button variant="ghost" size="sm" leading={<Icon icon={icons.BrowserIcon} size={14} />} onClick={() => void loadEverydayTabs()} className="self-start" data-testid="everyday-show">
        Your open tabs
      </Button>
    );
  }
  return (
    <section aria-label="Your open tabs" data-testid="everyday-tabs" className="flex max-h-60 flex-col gap-1 overflow-y-auto border-t border-border pt-2">
      {everyday.length ? null : <p className="px-2 py-1 text-[12px] text-fg-subtle">No open tabs found.</p>}
      {everyday.map((browser) => (
        <div key={browser.id} className="flex flex-col">
          <span className="truncate px-2 py-0.5 text-[12px] font-medium text-fg-muted">
            {browser.profile ? `${browser.name} · ${browser.profile}` : browser.name}
          </span>
          {browser.problem ? <p className="px-2 py-0.5 text-[12px] text-warning">{browser.problem}</p> : null}
          {browser.tabs
            // Keyed by where they are in the session (the same page can be open twice), before the search narrows them.
            .map((tab, i) => ({ tab, key: `${i}:${tab.url}` }))
            .filter(({ tab }) => matchesTab(tab, query))
            .map(({ tab, key }) => (
              <button
                key={key}
                type="button"
                title="Open it here"
                onClick={() => {
                  onClose();
                  void openTabHere(tab);
                }}
                className="flex min-w-0 flex-col rounded-lg px-2 py-1 text-left outline-none transition-colors duration-150 hover:bg-hover focus-visible:bg-hover"
                data-testid="everyday-tab"
              >
                <TabText tab={tab} />
              </button>
            ))}
        </div>
      ))}
    </section>
  );
}
