import { parse } from '@babel/parser';
import type { File } from '@babel/types';

/** JSX is only parsed in `.tsx` files: in `.ts` a `<T>` before an expression is a type assertion. */
const JSX_EXTENSION = '.tsx';

/** A TypeScript file's syntax tree (no type checking). */
export function parseSource(file: string, text: string): File {
  return parse(text, { sourceType: 'module', plugins: file.endsWith(JSX_EXTENSION) ? ['typescript', 'jsx'] : ['typescript'] });
}
