import type { HeldRequest } from '@common/types';
import { icons } from '@/shared/config';
import { BUTTON_ICON_SIZE, Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { failHeldRequest, saveHeldAsOverride, sendHeld, sendOriginal } from '../../model';
import { SEND_TITLES } from './constants';
import { FailMenu } from './FailMenu';

/** What to do with a held request: send it as edited, as it was, fail it, or (a response) keep the edit as an override. */
export function HeldActions({ tabId, held }: { tabId: string; held: HeldRequest }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      {held.stage === 'response' ? (
        <Button size="sm" variant="ghost" onClick={() => void saveHeldAsOverride(tabId)} title="Answer with your version, and keep it as a response override" data-testid="held-save">
          Save as override
        </Button>
      ) : null}
      <FailMenu onFail={(reason) => void failHeldRequest(held.id, reason)} />
      <Button size="sm" variant="secondary" onClick={() => void sendOriginal(held.id)} title="Let it go as it was" data-testid="held-send-original">
        Send original
      </Button>
      <Button
        size="sm"
        variant="primary"
        leading={<Icon icon={icons.SendIcon} size={BUTTON_ICON_SIZE.sm} />}
        onClick={() => void sendHeld(tabId)}
        title={SEND_TITLES[held.stage]}
        data-testid="held-send"
      >
        Send
      </Button>
    </div>
  );
}
