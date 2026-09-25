import { parse } from '@babel/parser';
import type { File } from '@babel/types';
import { PARSE_PLUGINS, URL_SUFFIX } from './constants';
import { parsedOriginal } from './parsedOriginal';

/** An original's syntax tree, if its file is JavaScript or TypeScript and parses (errors recovered where it can). */
export function parseOriginal(url: string, content: string): File | null {
  if (parsedOriginal.url === url && parsedOriginal.content === content) return parsedOriginal.file;
  const plugins = PARSE_PLUGINS.find(([pattern]) => pattern.test(url.replace(URL_SUFFIX, '')))?.[1];
  let file: File | null = null;
  try {
    file = plugins ? parse(content, { sourceType: 'module', plugins, errorRecovery: true, allowReturnOutsideFunction: true, allowImportExportEverywhere: true }) : null;
  } catch {
    file = null;
  }
  Object.assign(parsedOriginal, { url, content, file });
  return file;
}
