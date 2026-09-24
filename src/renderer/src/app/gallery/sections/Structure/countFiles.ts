import type { FileNode } from './types';

export const countFiles = (node: FileNode): number => (node.children ? node.children.reduce((n, c) => n + countFiles(c), 0) : 1);
