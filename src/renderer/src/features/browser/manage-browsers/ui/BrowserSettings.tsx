import { icons } from '@/shared/config';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { useBrowserStore } from '@/entities/browser';
import { addBrowser } from '../model';
import { BrowserSettingRow } from './BrowserSettingRow';

/** Settings › Browsers: the browsers found and added, which are offered beside the address bar, and adding one. */
export function BrowserSettings() {
  const browsers = useBrowserStore((s) => s.browsers);
  return (
    <section className="flex flex-col gap-0.5" aria-label="Browsers" data-testid="browser-settings">
      <span className="label-caps px-2 pb-1 pt-3">Browsers</span>
      <p className="px-2 pb-1 text-[12px] leading-snug text-fg-subtle">The ones switched on are offered beside the address bar, to open the page in.</p>
      {browsers.map((browser) => (
        <BrowserSettingRow key={browser.id} browser={browser} />
      ))}
      <Button variant="ghost" size="sm" leading={<Icon icon={icons.AddIcon} size={14} />} onClick={() => void addBrowser()} className="mt-1 self-start">
        Add a browser…
      </Button>
    </section>
  );
}
