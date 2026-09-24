import type { ResourceEntry } from '@common/types';

export type ResourceRow =
  | { type: 'origin'; key: string; origin: string; label: string; count: number; depth: 0; expanded: boolean }
  | { type: 'folder'; key: string; label: string; depth: number; expanded: boolean; count: number }
  | { type: 'file'; key: string; label: string; depth: number; entry: ResourceEntry };

export interface ParsedUrl {
  origin: string;
  dirs: string[];
  /** Last path segment plus the query: the row label and sort key. */
  file: string;
}

export interface Folder {
  name: string;
  folders: Map<string, Folder>;
  files: { entry: ResourceEntry; file: string }[];
  /** Files in this folder and below. */
  count: number;
}
