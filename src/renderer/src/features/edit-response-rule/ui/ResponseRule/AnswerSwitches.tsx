import { Switch } from '@/shared/ui/switch';
import type { ResponseRuleForm } from '../../model';

export interface AnswerSwitchesProps {
  send: boolean;
  patch: boolean;
  onChange(change: Pick<ResponseRuleForm, 'send' | 'patch'>): void;
}

/**
 * Whether the request is sent, and whether the page gets the live response patched with the edits or
 * the saved text. Patching needs the live response, so turning it on sends the request, and not
 * sending it turns patching off.
 */
export function AnswerSwitches({ send, patch, onChange }: AnswerSwitchesProps) {
  return (
    <>
      <Switch
        size="sm"
        checked={send}
        onCheckedChange={(next) => onChange({ send: next, patch: next && patch })}
        label="Send request"
        title={send ? 'The request reaches the server, and its response is replaced' : 'Answered before it is sent: the server never sees it (a POST changes nothing)'}
      />
      <Switch
        size="sm"
        checked={patch}
        onCheckedChange={(next) => onChange({ send: send || next, patch: next })}
        label="Patch live"
        title={
          patch
            ? 'The page gets the live response with your changes applied; your saved text answers when the server fails'
            : 'The page gets your saved text as it is. Turn on to apply your changes to each live response instead'
        }
      />
    </>
  );
}
