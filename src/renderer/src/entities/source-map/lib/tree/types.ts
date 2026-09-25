/** An original's place in the tree: the root it groups under, its folders, and its file name. */
export interface SourcePath {
  root: string;
  dirs: string[];
  file: string;
}
