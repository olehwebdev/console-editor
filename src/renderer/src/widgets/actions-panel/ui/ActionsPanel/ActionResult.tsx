import { icons } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import type { ActionRun } from '@/features/action/run';
import { NEWLINE, RESULT_ICON_SIZE } from './constants';

/** How an action's last run went: what it gave back, what it threw, or why it couldn't run. */
export function ActionResult({ run }: { run: Exclude<ActionRun, { state: 'running' }> }) {
  const failed = run.state === 'failed' || run.entry.level === 'error';
  const full = run.state === 'failed' ? run.message : run.entry.values.map((v) => v.text).join(' ');
  const text = run.state === 'failed' ? run.message : run.entry.values.map((v) => v.text.split(NEWLINE, 1)[0]).join(' ');
  return (
    <p
      data-testid="action-result"
      data-failed={failed || undefined}
      title={full}
      className={cn('flex min-w-0 items-start gap-1.5 pl-1 pr-2 text-[11.5px] leading-4', failed ? 'text-danger' : 'text-fg-muted')}
    >
      <Icon icon={failed ? icons.ErrorIcon : icons.SuccessIcon} size={RESULT_ICON_SIZE} className={cn('mt-0.5 shrink-0', !failed && 'text-live')} />
      <span className={cn('min-w-0 line-clamp-2 break-all', run.state === 'done' && 'font-mono')}>{text}</span>
    </p>
  );
}
