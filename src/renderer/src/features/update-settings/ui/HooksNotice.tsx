import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import type { IconGlyph } from '@/shared/ui/icon';
import { useSettingsStore } from '@/entities/settings';
import { setSetting } from '../model/setSetting';

export interface HooksNoticeProps {
  icon: IconGlyph;
  /** What the framework hooks tell the app, and why they must be in the page before its scripts. */
  hooksText: string;
  /** Why the console's recording is needed. */
  consoleText: string;
  'data-testid'?: string;
}

/**
 * Why nothing can be recorded, when that is so: what the framework hooks hear reaches the app through the
 * console's Runtime domain, from stand-ins **Framework hooks** puts in each page before its scripts.
 * Offers to turn on whichever is off (the console first).
 */
export function HooksNotice({ icon, hooksText, consoleText, 'data-testid': testId }: HooksNoticeProps) {
  const consoleOn = useSettingsStore((s) => s.settings.captureConsole);
  const hooks = useSettingsStore((s) => s.settings.frameworkHooks);
  if (consoleOn && hooks) return null;
  const setting = consoleOn ? 'frameworkHooks' : 'captureConsole';
  return (
    <EmptyState
      icon={icon}
      title={consoleOn ? 'Framework hooks are off' : "The console isn't recording"}
      size="sm"
      className="py-4"
      actions={
        <Button size="sm" variant="secondary" onClick={() => void setSetting(setting, true)}>
          Turn it on
        </Button>
      }
      data-testid={testId}
    >
      {consoleOn ? hooksText : consoleText}
    </EmptyState>
  );
}
