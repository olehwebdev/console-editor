import { icons } from '@/shared/config';
import { HooksNotice } from '@/features/update-settings';

/** Why no renders can be recorded, when that is so (the console, or the hooks, is off). */
export function RendersNotice() {
  return (
    <HooksNotice
      icon={icons.RendersIcon}
      hooksText="React tells the app about its commits through a hook the app puts in each page before the page's scripts: turn it on, then reload the page."
      consoleText="Renders reach the app the way the console's rows do: turn the console's recording on to record them."
      data-testid="renders-notice"
    />
  );
}
