import type { NetworkRequest, NetworkRequestDetail } from '@common/types';
import { icons } from '@/shared/config';
import { BUTTON_ICON_SIZE, Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { pauseLike } from '@/features/network/breakpoints';
import { showHeld } from '@/features/network/held';
import { openResource, openResponse } from '@/features/open-resource';
import { opensAsFile, overridable, pausable } from '../../lib';
import { ActionLabel } from './ActionLabel';
import { CopyMenu } from './CopyMenu';

export interface DetailActionsProps {
  request: NetworkRequest;
  /** Its headers and body, once read: Copy as fetch needs them. */
  detail?: NetworkRequestDetail;
}

/**
 * What can be done with the selected request: open it where a breakpoint holds it, override its
 * response (or open the override that answers it), open its file, pause requests like it, copy it.
 */
export function DetailActions({ request, detail }: DetailActionsProps) {
  const file = opensAsFile(request);
  const heldId = request.heldId;
  return (
    <div className="flex shrink-0 items-center gap-1">
      {heldId ? (
        <Button size="sm" variant="primary" leading={<Icon icon={icons.PauseIcon} size={BUTTON_ICON_SIZE.sm} />} title="Show paused" onClick={() => showHeld(heldId)} data-testid="network-show-held">
          <ActionLabel>Show paused</ActionLabel>
        </Button>
      ) : null}
      {overridable(request) && !file && !heldId ? (
        <Button
          size="sm"
          variant="primary"
          leading={<Icon icon={icons.ResponseIcon} size={BUTTON_ICON_SIZE.sm} />}
          title={request.overrideId ? 'Open override' : 'Override response'}
          onClick={() => void openResponse(request)}
          data-testid="network-override"
        >
          <ActionLabel>{request.overrideId ? 'Open override' : 'Override response'}</ActionLabel>
        </Button>
      ) : null}
      {file ? (
        <Button size="sm" variant="secondary" leading={<Icon icon={icons.FileIcon} size={BUTTON_ICON_SIZE.sm} />} title="Open file" onClick={() => void openResource(request.url)}>
          <ActionLabel>Open file</ActionLabel>
        </Button>
      ) : null}
      {pausable(request) ? (
        <IconButton icon={icons.BreakpointIcon} label="Pause requests like this (at their response)" size="sm" data-testid="network-pause-like" onClick={() => pauseLike(request)} />
      ) : null}
      <CopyMenu request={request} detail={detail} />
    </div>
  );
}
