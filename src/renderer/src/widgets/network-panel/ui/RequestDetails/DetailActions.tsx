import type { NetworkRequest } from '@common/types';
import { icons } from '@/shared/config';
import { BUTTON_ICON_SIZE, Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { openResource, openResponse } from '@/features/open-resource';
import { opensAsFile, overridable } from '../../lib';

/** What can be done with the selected request: override its response (or open the override that answers it), open its file, copy its URL. */
export function DetailActions({ request }: { request: NetworkRequest }) {
  const file = opensAsFile(request);
  return (
    <div className="flex shrink-0 items-center gap-1">
      {overridable(request) && !file ? (
        <Button
          size="sm"
          variant="primary"
          leading={<Icon icon={icons.ResponseIcon} size={BUTTON_ICON_SIZE.sm} />}
          onClick={() => void openResponse(request)}
          data-testid="network-override"
        >
          {request.overrideId ? 'Open override' : 'Override response'}
        </Button>
      ) : null}
      {file ? (
        <Button size="sm" variant="secondary" leading={<Icon icon={icons.FileIcon} size={BUTTON_ICON_SIZE.sm} />} onClick={() => void openResource(request.url)}>
          Open file
        </Button>
      ) : null}
      <IconButton icon={icons.CopyIcon} label="Copy URL" size="sm" onClick={() => void navigator.clipboard.writeText(request.url)} />
    </div>
  );
}
