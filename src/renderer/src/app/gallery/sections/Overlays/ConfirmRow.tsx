import { confirm } from '@/shared/ui/dialog';
import { DemoButton } from './DemoButton';
import { Row } from './Row';

/** The confirm dialog in both tones, and how it was last answered (the file menu's delete answers here too). */
export function ConfirmRow({ answer, onAnswer }: { answer: string; onAnswer: (answer: string) => void }) {
  return (
    <Row title="Confirm dialog" note="Enter confirms, Esc cancels, Tab is trapped.">
      <DemoButton
        onClick={() =>
          void confirm({
            title: 'Delete override?',
            body: 'main.js will be served from the network again.',
            confirmLabel: 'Delete',
            tone: 'danger',
          }).then((ok) => onAnswer(ok ? 'Confirmed (danger)' : 'Cancelled (danger)'))
        }
      >
        Danger
      </DemoButton>
      <DemoButton
        onClick={() =>
          void confirm({ title: 'Reload the page?', body: 'Unsaved edits stay in the editor.', confirmLabel: 'Reload' }).then((ok) =>
            onAnswer(ok ? 'Confirmed (accent)' : 'Cancelled (accent)'),
          )
        }
      >
        Accent
      </DemoButton>
      <span className="ml-2 text-xs text-fg-subtle">
        Last answer: <span className="font-mono text-fg-muted">{answer}</span>
      </span>
    </Row>
  );
}
