const SEPARATOR = /[\s/\\.\-_:?#=&@]/;

export function isWordStart(text: string, index: number): boolean {
  if (index === 0) return true;
  const prev = text[index - 1];
  const char = text[index];
  if (prev === undefined || char === undefined) return false;
  if (SEPARATOR.test(prev)) return true;
  // camelCase / PascalCase boundary.
  return prev === prev.toLowerCase() && char !== char.toLowerCase();
}
