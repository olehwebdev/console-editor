import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { caseClashes } from '../../scripts/structure/caseClashes';
import { checkFile } from '../../scripts/structure/checkFile';
import { findCaseClashes } from '../../scripts/structure/findCaseClashes';

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

describe('case clash check', () => {
  const files = (...names: string[]) => names.map((name) => ({ name, directory: false }));

  it('flags modules an import without an extension reaches by names that differ only in case', () => {
    // The pairs that broke the 0.4.0 build on macOS and Windows.
    expect(caseClashes(files('ActionFields.tsx', 'actionFields.ts', 'RuleNotes.tsx', 'ruleNotes.ts', 'types.ts'))).toEqual([
      ['ActionFields.tsx', 'actionFields.ts'],
      ['RuleNotes.tsx', 'ruleNotes.ts'],
    ]);
    // A folder is a module by its name, through its index.
    expect(caseClashes([...files('Foo.ts'), { name: 'foo', directory: true }])).toEqual([['Foo.ts', 'foo']]);
    expect(caseClashes(files('data.json', 'Data.js'))).toEqual([['Data.js', 'data.json']]);
  });

  it('flags any two names that differ only in case, module or not', () => {
    expect(caseClashes(files('logo.svg', 'Logo.svg'))).toEqual([['Logo.svg', 'logo.svg']]);
    // One group, though the pair clashes both by its names and as modules.
    expect(caseClashes(files('Foo.ts', 'foo.ts'))).toEqual([['Foo.ts', 'foo.ts']]);
  });

  it('passes names a lookup can tell apart', () => {
    // A stylesheet is imported by its whole name.
    expect(caseClashes(files('Markdown.tsx', 'markdown.css', 'index.ts'))).toEqual([]);
    // Spelled alike: the same on every file system.
    expect(caseClashes([...files('Foo.ts', 'Foo.tsx'), { name: 'Foo', directory: true }])).toEqual([]);
    expect(caseClashes(files('ruleActionFields.ts', 'ActionFields.tsx', 'ruleNotesFor.ts', 'RuleNotes.tsx'))).toEqual([]);
  });

  it('walks src, scripts and test, and names the folder of each clash', () => {
    const root = mkdtempSync(join(tmpdir(), 'case-clashes-'));
    const write = (path: string) => {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), '');
    };
    try {
      ['src/a/b/Row.tsx', 'src/a/b/row.ts', 'src/ui/Markdown.tsx', 'src/ui/markdown.css', 'scripts/check.ts', 'test/unit/Tree.test.ts', 'test/unit/tree.test.ts', 'docs/X.ts', 'docs/x.ts'].forEach(write);
      expect(findCaseClashes(root).map((v) => [v.file, v.rule, v.detail.split(':')[0]])).toEqual([
        [join('src', 'a', 'b'), 'no case clashes', 'Row.tsx, row.ts'],
        [join('test', 'unit'), 'no case clashes', 'Tree.test.ts, tree.test.ts'],
      ]);
      rmSync(join(root, 'src/a/b/row.ts'));
      rmSync(join(root, 'test/unit/tree.test.ts'));
      expect(findCaseClashes(root)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
