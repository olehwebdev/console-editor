import type { BrowserInfo } from '@common/types';
import { icons } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';
import { Switch } from '@/shared/ui/switch';
import { BrowserIcon } from '@/entities/browser';
import { removeBrowser, showBrowser } from '../model';

/** Words for each engine: what the app can do with a browser depends on it. */
const ENGINE_LABEL: Record<BrowserInfo['engine'], string> = { chromium: 'Chromium', gecko: 'Firefox (Gecko)', webkit: 'WebKit', unknown: 'Other' };

/** A browser in Settings: whether it is offered beside the address bar, and (one the user added) removing it. */
export function BrowserSettingRow({ browser }: { browser: BrowserInfo }) {
  const detail = [ENGINE_LABEL[browser.engine], browser.version, browser.added ? 'added by you' : null].filter(Boolean).join(' · ');
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-hover" data-testid="browser-setting">
      <BrowserIcon browser={browser} size={20} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] text-fg">{browser.name}</span>
        <span className="block truncate text-[12px] text-fg-subtle">{detail}</span>
      </span>
      {browser.added ? <IconButton icon={icons.DeleteIcon} label={`Remove ${browser.name}`} size="sm" danger onClick={() => void removeBrowser(browser)} /> : null}
      <Switch size="sm" tone="accent" checked={!browser.hidden} onCheckedChange={(on) => void showBrowser(browser, on)} aria-label={`Offer ${browser.name}`} />
    </div>
  );
}
