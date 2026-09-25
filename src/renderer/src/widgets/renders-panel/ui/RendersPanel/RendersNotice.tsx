import { icons } from '@/shared/config';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { useSettingsStore } from '@/entities/settings';
import { setSetting } from '@/features/update-settings';

/**
 * Why nothing can be recorded, when that is so: renders reach the app through the console's Runtime domain,
 * and from the React hook stand-in, which **Framework hooks** puts in each page before its scripts.
 */
export function RendersNotice() {
  const consoleOn = useSettingsStore((s) => s.settings.captureConsole);
  const hooks = useSettingsStore((s) => s.settings.frameworkHooks);
  if (consoleOn && hooks) return null;
  const setting = consoleOn ? 'frameworkHooks' : 'captureConsole';
  return (
    <EmptyState
      icon={icons.RendersIcon}
      title={consoleOn ? 'Framework hooks are off' : "The console isn't recording"}
      size="sm"
      className="py-4"
      actions={
        <Button size="sm" variant="secondary" onClick={() => void setSetting(setting, true)}>
          Turn it on
        </Button>
      }
      data-testid="renders-notice"
    >
      {consoleOn
        ? "React tells the app about its commits through a hook the app puts in each page before the page's scripts: turn it on, then reload the page."
        : "Renders reach the app the way the console's rows do: turn the console's recording on to record them."}
    </EmptyState>
  );
}
