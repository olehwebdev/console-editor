/**
 * Claude Code's Stop hook (.claude/settings.json): when the agent is about to finish with changes in the working
 * tree, runs the fast checks side by side and, if any fails, sends the agent back to make it pass. The next time
 * it tries to stop, it may, and the person is told what still fails: a check the agent can't fix never keeps it
 * going for ever. Without changes it does nothing.
 *
 *   echo '{}' | node scripts/check-before-stop.ts
 */
import { join } from 'node:path';
import { BLOCKING_EXIT, OUTPUT_TAIL_LINES, STOP_CHECKS } from './agent-hooks/constants.ts';
import { hasChanges } from './agent-hooks/hasChanges.ts';
import { readHookInput } from './agent-hooks/readHookInput.ts';
import { runScript } from './agent-hooks/runScript.ts';

const root = join(import.meta.dirname, '..');
const input = readHookInput();
if (!hasChanges(root)) process.exit(0);

const failed = (await Promise.all(STOP_CHECKS.map((script) => runScript(root, script)))).filter((result) => !result.ok);
if (!failed.length) process.exit(0);

const names = failed.map((result) => `npm run ${result.script}`).join(', ');
if (input.stop_hook_active) {
  // stdout JSON is shown to the person, and exit 0 lets the agent stop.
  console.log(JSON.stringify({ systemMessage: `These checks still fail: ${names}.` }));
  process.exit(0);
}
console.error(`Before finishing, make these checks pass (CLAUDE.md › Before pushing): ${names}.`);
for (const { script, output } of failed) console.error(`\n$ npm run ${script}\n${output.split('\n').slice(-OUTPUT_TAIL_LINES).join('\n')}`);
process.exit(BLOCKING_EXIT);
