import { describe, expect, it } from 'vitest';
import { agentCredits } from '../../scripts/commit-message/agentCredits';
import { isAgentIdentity } from '../../scripts/commit-message/isAgentIdentity';

const message = (...body: string[]) => ['Fix the page window race', '', 'Wait for the window to close first.', '', ...body].join('\n');

describe('commit-message check', () => {
  it('passes a message that credits people only', () => {
    expect(agentCredits(message())).toEqual([]);
    expect(agentCredits(message('Co-Authored-By: Ann Lee <ann@example.com>', 'Co-authored-by: Claude Monet <claude.monet@example.com>'))).toEqual([]);
    // Prose about the rule isn't a trailer.
    expect(agentCredits(message('Refuse Co-Authored-By trailers that name an agent, and Claude-Session links.'))).toEqual([]);
  });

  it('finds co-author trailers that name an agent, by address, GitHub account or name', () => {
    const trailers = [
      'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>',
      'co-authored-by: Cursor Agent <cursoragent@cursor.com>',
      'Co-authored-by: Copilot <175728472+Copilot@users.noreply.github.com>',
      'Co-authored-by: google-labs-jules[bot] <161369871+google-labs-jules[bot]@users.noreply.github.com>',
      'Co-Authored-By: Claude <claude@example.com>',
    ];
    expect(agentCredits(message(...trailers))).toEqual(trailers);
  });

  it('finds session links and "Generated with" lines, whatever they name', () => {
    const lines = ['Claude-Session: https://claude.ai/code/session_01ABC', 'See https://claude.ai/code/session_01ABC', '🤖 Generated with [Claude Code](https://claude.com/claude-code)'];
    expect(agentCredits(message(...lines))).toEqual(lines);
  });

  it("leaves out git's comments and the diff under the scissors line", () => {
    const verbose = message('# Please enter the commit message for your changes.', '# Co-Authored-By: Claude <noreply@anthropic.com>', '# ------------------------ >8 ------------------------', '+Claude-Session: https://claude.ai/code/session_01ABC', 'Co-Authored-By: Claude <noreply@anthropic.com>');
    expect(agentCredits(verbose)).toEqual([]);
  });

  it("tells an agent's identity from a person's", () => {
    expect(isAgentIdentity('Claude <noreply@anthropic.com>')).toBe(true);
    expect(isAgentIdentity('Anyone <NoReply@Anthropic.com>')).toBe(true);
    expect(isAgentIdentity('copilot-swe-agent[bot] <198982749+Copilot@users.noreply.github.com>')).toBe(true);
    expect(isAgentIdentity('Oleh H <12345+olehwebdev@users.noreply.github.com>')).toBe(false);
    expect(isAgentIdentity('Ann Lee <ann@anthropic.com>')).toBe(false);
    expect(isAgentIdentity('not an identity')).toBe(false);
  });
});
