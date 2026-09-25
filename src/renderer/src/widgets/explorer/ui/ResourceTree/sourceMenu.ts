import { icons } from '@/shared/config';
import type { MenuItem } from '@/shared/ui/menu';
import { goToBundle, openOriginalSource } from '@/features/open-resource';
import type { ExplorerRowOf } from '../../lib';

/** An original's context menu. */
export function sourceMenu({ bundleUrl, bundleKind, source }: ExplorerRowOf<'source'>): MenuItem[] {
  return [
    { label: 'Open', icon: icons.SourceFileIcon, onSelect: () => void openOriginalSource(bundleUrl, bundleKind, source.url) },
    {
      label: 'Go to bundle code',
      icon: icons.JumpIcon,
      // From the file's first line with code, behind the bundle's tab.
      onSelect: () => void openOriginalSource(bundleUrl, bundleKind, source.url, { activate: false }).then((id) => (id ? goToBundle(id, 1) : undefined)),
    },
    { label: 'Copy path', icon: icons.CopyIcon, onSelect: () => void navigator.clipboard.writeText(source.url) },
  ];
}
