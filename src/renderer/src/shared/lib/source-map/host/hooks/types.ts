import type { File, Node } from '@babel/types';

/** A hook called in a function's body: which hook, and the variable it sets, if any. */
export interface HookCall {
  hook: string;
  name: string | null;
  start: number;
}

/** A function's hook entries in React's order, named; `complete` is false where a hook it can't follow stopped the reading. */
export interface HookLayout {
  names: Array<string | null>;
  complete: boolean;
}

/** The last original parsed: components of one file are usually looked at together. */
export interface ParsedOriginal {
  url: string | null;
  content: string | null;
  file: File | null;
}

export type AnyNode = Node & Record<string, unknown>;
