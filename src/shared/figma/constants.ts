/** Figma's hosts, and the kinds of link that name a file (a design, its prototype, a FigJam board…) before its key. */
export const FIGMA_HOSTS: ReadonlySet<string> = new Set(['figma.com', 'www.figma.com']);
export const FIGMA_FILE_KINDS: ReadonlySet<string> = new Set(['design', 'file', 'proto', 'board']);

/** A branch's link: the file's key, then this, then the branch's key (the file to ask for). */
export const BRANCH_SEGMENT = 'branch';

/** The frame a link points at (`node-id=12-34`), and how its id is written there and in Figma's API (`12:34`). */
export const NODE_ID_PARAM = 'node-id';
export const NODE_ID_SEPARATOR = { link: '-', api: ':' } as const;

/** The longest personal access token taken. */
export const MAX_FIGMA_TOKEN = 200;
