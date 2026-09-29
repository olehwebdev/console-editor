/** A Figma frame to import as a design: its link, and a personal access token ('' to use the one kept). */
export interface FigmaImport {
  link: string;
  token: string;
}

/** A frame in a Figma file, as its link names it: the file's key, and the node's id as Figma's API writes it (`12:34`). */
export interface FigmaFrame {
  fileKey: string;
  nodeId: string;
}
