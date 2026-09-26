/**
 * Claude Code's PostToolUse hook (.claude/settings.json): after the agent edits or writes a file, lints it with
 * oxlint (`npm run lint`, type-aware) and hands what it found back to the agent, to fix while the change is fresh.
 * Leaves alone files oxlint doesn't read, and those outside the project or ignored by git.
 *
 *   echo '{"tool_input":{"file_path":"src/main/index.ts"}}' | node scripts/lint-edited-file.ts
 */
import { join } from 'node:path';
import { BLOCKING_EXIT } from './agent-hooks/constants.ts';
import { lintableFile } from './agent-hooks/lintableFile.ts';
import { readHookInput } from './agent-hooks/readHookInput.ts';
import { runScript } from './agent-hooks/runScript.ts';

const root = join(import.meta.dirname, '..');
const file = lintableFile(root, readHookInput().tool_input?.file_path);
const result = file && (await runScript(root, 'lint', [file]));
if (result && !result.ok) {
  console.error(`oxlint found problems in ${file} (npm run lint):\n${result.output}`);
  process.exit(BLOCKING_EXIT);
}
