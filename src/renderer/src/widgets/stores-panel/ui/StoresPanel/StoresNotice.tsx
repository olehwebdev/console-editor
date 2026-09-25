import { icons } from '@/shared/config';
import { HooksNotice } from '@/features/update-settings';

/** Why no store actions can be recorded, when that is so (the console, or the hooks, is off). */
export function StoresNotice() {
  return (
    <HooksNotice
      icon={icons.StoresIcon}
      hooksText="The page's stores are heard through stand-ins the app puts in each page before the page's scripts: turn them on, then reload the page."
      consoleText="Store actions reach the app the way the console's rows do: turn the console's recording on to record them."
      data-testid="stores-notice"
    />
  );
}
