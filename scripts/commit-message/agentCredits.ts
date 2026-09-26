import { AGENT_LINES, CO_AUTHOR_TRAILER, COMMENT_PREFIX, SCISSORS_LINE } from './constants.ts';
import { isAgentIdentity } from './isAgentIdentity.ts';

/**
 * The lines of a commit message that credit a coding agent: a `Co-Authored-By` trailer naming one, a session link or
 * trailer, a "Generated with" line. Reads the message as git's hooks get it, leaving out git's comments and diff.
 */
export function agentCredits(message: string): string[] {
  const lines = message.split('\n');
  const scissors = lines.indexOf(SCISSORS_LINE);
  return (scissors === -1 ? lines : lines.slice(0, scissors))
    .map((line) => line.trim())
    .filter((line) => !line.startsWith(COMMENT_PREFIX))
    .filter((line) => {
      const coAuthor = CO_AUTHOR_TRAILER.exec(line);
      return coAuthor ? isAgentIdentity(coAuthor[1]!) : AGENT_LINES.some((pattern) => pattern.test(line));
    });
}
