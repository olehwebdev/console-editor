import { cn } from '@/shared/lib';
import { Button } from '@/shared/ui/button';

interface RecordButtonProps {
  recording: boolean;
  onToggle(): void;
  testId: string;
}

/** Turns recording a log of the page (its renders, its stores' actions) on or off; its dot pulses while it records. */
export function RecordButton({ recording, onToggle, testId }: RecordButtonProps) {
  return (
    <Button size="sm" variant={recording ? 'secondary' : 'ghost'} onClick={onToggle} aria-pressed={recording} data-testid={testId}>
      <span className={cn('size-2 rounded-full', recording ? 'animate-pulse bg-danger' : 'bg-fg-subtle')} />
      {recording ? 'Recording' : 'Record'}
    </Button>
  );
}
