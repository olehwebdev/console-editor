import type { ParserPlugin } from '@babel/parser';

/**
 * How many entries each of React's own hooks adds to a component's hook list (its fiber's `memoizedState`),
 * as React 19 mounts them. Hooks are kept by position, so a name read off the original has to land on the
 * right entry: `useSyncExternalStore` and `useTransition` add two, `useActionState` three, and
 * `useContext`, `use` and `useDebugValue` none.
 */
export const HOOK_ENTRIES: ReadonlyMap<string, number> = new Map([
  ['useState', 1],
  ['useReducer', 1],
  ['useRef', 1],
  ['useMemo', 1],
  ['useCallback', 1],
  ['useEffect', 1],
  ['useLayoutEffect', 1],
  ['useInsertionEffect', 1],
  ['useImperativeHandle', 1],
  ['useId', 1],
  ['useDeferredValue', 1],
  ['useOptimistic', 1],
  ['useEffectEvent', 1],
  ['useSyncExternalStore', 2],
  ['useTransition', 2],
  ['useActionState', 3],
  ['useFormState', 3],
  ['useContext', 0],
  ['use', 0],
  ['useDebugValue', 0],
  ['useFormStatus', 0],
]);

/** A custom hook, by React's naming rule. */
export const CUSTOM_HOOK = /^use[A-Z0-9]/;
/** Custom hooks followed into their definitions (in the same file) at most this deep. */
export const MAX_HOOK_DEPTH = 8;

/** How an original is parsed, by its file's extension (query and hash left out); other files aren't. */
export const PARSE_PLUGINS: ReadonlyArray<readonly [RegExp, ParserPlugin[]]> = [
  [/\.tsx$/i, ['typescript', 'jsx']],
  [/\.[mc]?ts$/i, ['typescript']],
  [/\.[mc]?jsx?$/i, ['jsx']],
];
export const URL_SUFFIX = /[?#].*$/;

/** Nodes a hook call can sit in and still be what a variable is set to (`useRef(null) as Ref`). */
export const TRANSPARENT: ReadonlySet<string> = new Set(['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression', 'ParenthesizedExpression', 'TypeCastExpression']);
export const FUNCTION_TYPES: ReadonlySet<string> = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'ObjectMethod', 'ClassMethod', 'ClassPrivateMethod']);
/** Node keys that aren't code. */
export const SKIPPED_KEYS: ReadonlySet<string> = new Set(['loc', 'extra', 'leadingComments', 'trailingComments', 'innerComments', 'typeAnnotation', 'returnType', 'typeParameters']);
