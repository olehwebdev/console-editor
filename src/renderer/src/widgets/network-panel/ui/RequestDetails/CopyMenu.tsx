import type { NetworkRequest, NetworkRequestDetail } from '@common/types';
import { icons } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';
import { Menu } from '@/shared/ui/menu';
import { fetchSnippet } from '@/entities/network-request';

/** Copies the request: its URL, or (once its headers are read) a fetch() call that sends it again. */
export function CopyMenu({ request, detail }: { request: NetworkRequest; detail?: NetworkRequestDetail }) {
  return (
    <Menu
      label="Copy"
      align="end"
      items={[
        { label: 'Copy URL', onSelect: () => void navigator.clipboard.writeText(request.url) },
        {
          label: 'Copy as fetch',
          disabled: !detail,
          onSelect: () => {
            if (detail) void navigator.clipboard.writeText(fetchSnippet(request, detail));
          },
        },
      ]}
    >
      <IconButton icon={icons.CopyIcon} label="Copy" size="sm" data-testid="network-copy" />
    </Menu>
  );
}
