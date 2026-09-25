/**
 * Code you keep to run in a frame of the page with one click: an event sent to
 * one service to watch another react (`addItem('A1')` in the cart's frame).
 * Each belongs to a workspace, as its frames are those of one site.
 */
export interface ConsoleAction {
  /** 8 hex chars. */
  id: string;
  name: string;
  /** The frame it runs in, by frame key: `top`, an iframe's address, `name:<name>` or `id:<id>` (see `frameKey`). */
  target: string;
  /** That frame's `name` attribute when it was picked ('' if none): the frame is found by it when none has `target` any more. */
  targetName: string;
  /** Run as the console runs it: top-level `await`, `$0`, `copy()`. */
  code: string;
  createdAt: number;
  updatedAt: number;
}

/** What an action is made of; its id and times are the store's. */
export type ActionInput = Pick<ConsoleAction, 'name' | 'target' | 'targetName' | 'code'>;

export type ActionPatch = Partial<ActionInput>;
