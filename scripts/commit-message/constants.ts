/**
 * What gives an agent credit in a commit (CLAUDE.md › Commits and pull requests): commits go out as the work of the
 * person the agent works for, so none of this may appear in their message or identity.
 */

/** Addresses coding agents sign commits and `Co-Authored-By` trailers with. */
export const AGENT_EMAILS = ['noreply@anthropic.com', 'cursoragent@cursor.com', 'noreply@aider.chat'];

/** GitHub accounts of coding agents, as their `<id>+<login>@users.noreply.github.com` addresses name them. */
export const AGENT_GITHUB_LOGINS = [
  'claude[bot]',
  'copilot',
  'copilot-swe-agent[bot]',
  'chatgpt-codex-connector[bot]',
  'cursor[bot]',
  'devin-ai-integration[bot]',
  'google-labs-jules[bot]',
];

/** Names agents sign with, whatever the address. */
export const AGENT_NAMES = ['claude', 'claude code', 'copilot', 'cursor agent', 'aider'];

/** GitHub's no-reply addresses: `<login>@…` or `<id>+<login>@…`. */
export const GITHUB_NOREPLY = /^(?:\d+\+)?(.+)@users\.noreply\.github\.com$/;

/** `Name <email>`, as in a trailer or `git var GIT_AUTHOR_IDENT` (which adds a timestamp after it). */
export const IDENTITY = /^\s*(.*?)\s*<([^>]*)>/;

/** A co-author trailer; the identity after it decides whether it credits an agent. */
export const CO_AUTHOR_TRAILER = /^co-authored-by:(.*)$/i;

/** Lines that credit an agent whoever they name: its session link, trailer, or "Generated with" line. */
export const AGENT_LINES = [/^claude-session:/i, /claude\.ai\/code\/session_/i, /^\W*generated with \[?claude code\b/i];

/**
 * git's own lines in the message file its hooks read: comments, and everything under the scissors line
 * (`git commit --verbose` puts the diff there). git removes them after the hook.
 */
export const COMMENT_PREFIX = '#';
export const SCISSORS_LINE = '# ------------------------ >8 ------------------------';
