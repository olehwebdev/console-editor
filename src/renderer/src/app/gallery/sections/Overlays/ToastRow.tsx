import { TOAST_DURATION } from '@/shared/config';
import { Kbd } from '@/shared/ui/kbd';
import { focusToasts, toast } from '@/shared/ui/toast';
import { SHORTCUT } from './constants';
import { DemoButton } from './DemoButton';
import { Row } from './Row';
import { saveFlow } from './saveFlow';
import { say } from './say';

/** A toast in each tone, one with an action, one updated in place, a sticky one, and the stack's controls. */
export function ToastRow() {
  return (
    <Row title="Toast" note="Hover or focus to fan out; swipe or Esc to dismiss. Alt+N (focusToasts) jumps to the stack.">
      <DemoButton onClick={() => toast({ title: 'Reloaded page', description: 'example.com · 42 resources' })}>Neutral</DemoButton>
      <DemoButton onClick={() => toast({ title: 'Override active', description: 'main.js is served from disk', tone: 'success' })}>Success</DemoButton>
      <DemoButton
        onClick={() =>
          toast({
            title: 'Upstream changed',
            description: 'The original main.js differs from your base.',
            tone: 'warning',
            action: { label: 'Compare', onClick: () => say('Diff opened') },
          })
        }
      >
        Warning + action
      </DemoButton>
      <DemoButton onClick={() => toast({ title: 'Could not save', description: 'EACCES: permission denied', tone: 'danger' })}>Danger</DemoButton>
      <DemoButton onClick={saveFlow}>Update in place</DemoButton>
      <DemoButton onClick={() => toast({ title: 'Sticky toast', description: 'Stays until dismissed', duration: TOAST_DURATION.pending })}>Sticky</DemoButton>
      <DemoButton onClick={() => toast.dismiss()}>Dismiss all</DemoButton>
      <DemoButton
        onClick={() => {
          if (!focusToasts()) say('No toasts to focus');
        }}
      >
        Focus stack <Kbd keys={SHORTCUT.focusToasts} />
      </DemoButton>
    </Row>
  );
}
