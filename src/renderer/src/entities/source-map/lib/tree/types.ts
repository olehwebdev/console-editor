import type { SourceMapKind } from '@common/types';
import type { OriginalSource } from '@/shared/lib';

/** An original's place in the tree: the root it groups under, its folders, and its file name. */
export interface SourcePath {
  root: string;
  dirs: string[];
  file: string;
}

/** Whether a nest or folder is open: `byDefault` unless the user flipped it. */
export type IsOpen = (key: string, byDefault: boolean) => boolean;

/** An http(s) origin, another scheme's root (`webpack://app`), a folder, or the group of library code. */
export type SourceFolderVariant = 'origin' | 'root' | 'folder' | 'library';

/** Why a nest shows a line of text instead of files. */
export type SourceStatus = 'unloaded' | 'loading' | 'failed' | 'empty';

/** A row of a bundle's nest of originals in the Explorer. */
export type SourceRow =
  | { type: 'source-folder'; key: string; depth: number; label: string; title: string; count: number; expanded: boolean; variant: SourceFolderVariant; bundleUrl: string }
  | { type: 'source'; key: string; depth: number; label: string; bundleUrl: string; bundleKind: SourceMapKind; source: OriginalSource }
  | { type: 'source-status'; key: string; depth: number; bundleUrl: string; bundleKind: SourceMapKind; status: SourceStatus; message: string };

/** A folder of originals while the tree is built. */
export interface SourceFolder {
  name: string;
  folders: Map<string, SourceFolder>;
  files: { source: OriginalSource; label: string }[];
  /** Files in this folder and below. */
  count: number;
}

/** A map's originals by root: those written for the app, and library code. */
export interface SourceHierarchy {
  authored: Map<string, SourceFolder>;
  libraries: Map<string, SourceFolder>;
  libraryCount: number;
}

/** Where a bundle's nest goes in the tree, and how it is shown. */
export interface NestInput {
  bundleUrl: string;
  bundleKind: SourceMapKind;
  /** The nest's own key; every row's key starts with it. */
  parentKey: string;
  /** The depth of the nest's top rows. */
  depth: number;
  isOpen: IsOpen;
  /** The Explorer filter, trimmed: only originals that match are shown, every folder open. */
  query: string;
}
