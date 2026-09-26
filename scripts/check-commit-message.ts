/**
 * git's commit-msg hook (lefthook.yml): refuses a commit that credits a coding agent, in its message (a
 * `Co-Authored-By` trailer naming one, a session link) or as its author or committer, since commits go out as the
 * work of the person the agent works for (CLAUDE.md › Commits and pull requests).
 *
 *   node scripts/check-commit-message.ts .git/COMMIT_EDITMSG
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { agentCredits } from './commit-message/agentCredits.ts';
import { isAgentIdentity } from './commit-message/isAgentIdentity.ts';

/**
 * The commit's identities, as `git var` reads them: the config, or the GIT_AUTHOR_* variables git hands its hooks
 * (`--author`, or the kept author of an amend).
 */
const IDENTITY_VARIABLES = { author: 'GIT_AUTHOR_IDENT', committer: 'GIT_COMMITTER_IDENT' };
/** The seconds and time zone `git var` adds after `Name <email>`. */
const IDENT_TIMESTAMP = /\s+\d+\s+[+-]\d{4}$/;

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/check-commit-message.ts <commit message file>');
  process.exit(1);
}

const credits = agentCredits(readFileSync(file, 'utf8'));
if (credits.length) {
  console.error('The commit message credits a coding agent. Remove these lines: the commit goes out as your work.');
  for (const line of credits) console.error(`  ${line}`);
}

const agents = Object.entries(IDENTITY_VARIABLES)
  .map(([role, variable]) => [role, execFileSync('git', ['var', variable], { encoding: 'utf8' }).trim().replace(IDENT_TIMESTAMP, '')] as const)
  .filter(([, identity]) => isAgentIdentity(identity));
for (const [role, identity] of agents) console.error(`The commit's ${role} is a coding agent (${identity}).`);
if (agents.length) console.error('Commit under your own name: git config user.name "Your Name" and git config user.email "you@example.com".');

if (credits.length || agents.length) {
  console.error('(CLAUDE.md › Commits and pull requests)');
  process.exit(1);
}
