import type { ComponentType } from 'react';
import type { ExplorerRowOf, ExplorerRowType } from '../../lib';
import { FileRow } from './FileRow';
import { FolderRow } from './FolderRow';
import { SourceFolderRow } from './SourceFolderRow';
import { SourceRow } from './SourceRow';
import { SourceStatusRow } from './SourceStatusRow';
import type { RowProps } from './types';

/** The component of each row type: a new row type fails typecheck until it has one. */
export const ROW_RENDERERS: { [T in ExplorerRowType]: ComponentType<RowProps<ExplorerRowOf<T>>> } = {
  origin: FolderRow,
  folder: FolderRow,
  file: FileRow,
  'source-folder': SourceFolderRow,
  source: SourceRow,
  'source-status': SourceStatusRow,
};
