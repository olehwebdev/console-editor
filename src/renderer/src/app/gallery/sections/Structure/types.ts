export type Kind = 'js' | 'css' | 'html';

export type FileNode = { id: string; name: string; kind?: Kind; live?: boolean; origin?: boolean; children?: FileNode[] };

export type FlatRow = { node: FileNode; depth: number; expanded?: boolean; count: number };
