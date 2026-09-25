/** React's fiber tag for a memo() wrapper: its child is the component itself. */
export const REACT_MEMO_TAG = 14;
/** React's fiber tag for a class component, whose state is set through `setState`. */
export const REACT_CLASS_TAG = 1;
/** A hook of a function component is named by its place, from 1. */
export const HOOK_PLACE = /^\d+$/;
/** A name that can follow a dot. */
export const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
