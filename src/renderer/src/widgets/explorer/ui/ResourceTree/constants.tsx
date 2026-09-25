import type { ReactNode } from 'react';
import type { SourceMapKind } from '@common/types';
import { icons } from '@/shared/config';
import { Icon, type IconGlyph } from '@/shared/ui/icon';
import { Spinner } from '@/shared/ui/spinner';
import type { SourceFolderVariant, SourceStatus } from '@/entities/source-map';
import { ensureSourceMap, reloadSourceMap } from '@/features/open-resource';
import { ROW_ICON_SIZE } from '../constants';

/** Each kind of folder of originals: an http(s) origin, another scheme's root, a folder, library code. */
export const SOURCE_FOLDER_GLYPHS: Record<SourceFolderVariant, (expanded: boolean) => { icon: IconGlyph; className: string }> = {
  origin: () => ({ icon: icons.GlobeIcon, className: 'text-info' }),
  root: () => ({ icon: icons.SourceRootIcon, className: 'text-fg-subtle' }),
  folder: (expanded) => ({ icon: expanded ? icons.FolderOpenIcon : icons.FolderIcon, className: 'text-fg-subtle' }),
  library: () => ({ icon: icons.LibraryIcon, className: 'text-fg-subtle' }),
};

interface StatusLook {
  icon: ReactNode;
  className: string;
  /** What clicking the line (or Enter) does, if anything. */
  action: { label: string; run(bundleUrl: string, kind: SourceMapKind): void } | null;
}

/** How a nest's line of text looks and acts in each status. */
export const SOURCE_STATUS_LOOKS: Record<SourceStatus, StatusLook> = {
  unloaded: {
    icon: <Icon icon={icons.InfoIcon} size={ROW_ICON_SIZE} className="text-fg-subtle" />,
    className: 'text-fg-subtle',
    action: { label: 'Read it again', run: (bundleUrl, kind) => void ensureSourceMap(bundleUrl, kind) },
  },
  loading: { icon: <Spinner size={ROW_ICON_SIZE} className="text-fg-subtle" />, className: 'text-fg-subtle', action: null },
  failed: {
    icon: <Icon icon={icons.WarningIcon} size={ROW_ICON_SIZE} className="text-warning" />,
    className: 'text-fg-muted',
    action: { label: 'Retry', run: (bundleUrl, kind) => void reloadSourceMap(bundleUrl, kind) },
  },
  empty: { icon: <Icon icon={icons.InfoIcon} size={ROW_ICON_SIZE} className="text-fg-subtle" />, className: 'text-fg-subtle', action: null },
};
