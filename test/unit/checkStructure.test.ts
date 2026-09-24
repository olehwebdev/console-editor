import { describe, expect, it } from 'vitest';
import { checkFile } from '../../scripts/structure/checkFile';

const rules = (file: string, text: string) => checkFile(file, text).map((v) => v.rule);

describe('code-structure check', () => {
  it('passes a file with one function named after it', () => {
    expect(rules('src/a/formatTime.ts', 'const PAD = 2;\nexport function formatTime(t: number) { return String(t).padStart(PAD, "0"); }\n')).toEqual([]);
    expect(rules('src/a/Row.tsx', 'export const Row = memo(function Row() { return <div />; });\n')).toEqual([]);
    // Overload signatures are one function.
    expect(rules('src/a/pick.ts', 'export function pick(a: string): string;\nexport function pick(a: number): number;\nexport function pick(a: unknown) { return a; }\n')).toEqual([]);
  });

  it('flags files over 150 lines', () => {
    const long = `export function long() {\n${'  void 0;\n'.repeat(150)}}\n`;
    expect(rules('src/a/long.ts', long)).toEqual(['thin files']);
    expect(rules('src/a/long.ts', `export function long() {\n${'  void 0;\n'.repeat(148)}}\n`)).toEqual([]);
  });

  it('flags a second function, a misnamed file, and functions in data files', () => {
    expect(rules('src/a/save.ts', 'export function save() {}\nconst helper = () => 1;\n')).toEqual(['one function per file']);
    expect(rules('src/a/save.ts', 'export class Saver {}\n')).toEqual(['named after its function']);
    expect(rules('src/a/constants.ts', 'export const A = 1;\nexport const make = () => A;\n')).toEqual(['data files hold data']);
    expect(rules('src/a/index.ts', "export { a } from './a';\nconst b = 2;\nexport { b };\n")).toEqual(['index files re-export']);
  });

  it('lets entry points and scripts hold startup statements', () => {
    expect(rules('src/main/index.ts', 'function a() {}\nfunction b() {}\na();\nb();\n')).toEqual([]);
    expect(rules('scripts/run.ts', 'const go = () => 1;\nconst stop = () => 2;\ngo(); stop();\n')).toEqual([]);
  });

  it('flags switch, and if/else chains and nested ternaries over one value', () => {
    expect(rules('src/a/f.ts', 'export function f(x: string) { switch (x) { default: return 1; } }\n')).toEqual(['no switch']);
    expect(rules('src/a/f.ts', "export function f(x: string) { if (x === 'a') return 1; else if (x === 'b') return 2; return 3; }\n")).toEqual(['no switch']);
    expect(rules('src/a/f.ts', "export const f = (x: string) => (x === 'a' ? 1 : x === 'b' ? 2 : 3);\n")).toEqual(['no switch']);
    // Different values, or a single comparison, are fine.
    expect(rules('src/a/f.ts', "export const f = (x: string, y: string) => (x === 'a' ? 1 : y === 'b' ? 2 : 3);\n")).toEqual([]);
  });
});
