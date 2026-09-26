import { AGENT_EMAILS, AGENT_GITHUB_LOGINS, AGENT_NAMES, GITHUB_NOREPLY, IDENTITY } from './constants.ts';

/** Whether `Name <email>` (a trailer's value, or git's author or committer ident) is a coding agent's. */
export function isAgentIdentity(identity: string): boolean {
  const [, name = '', email = ''] = IDENTITY.exec(identity) ?? [];
  const address = email.trim().toLowerCase();
  const login = GITHUB_NOREPLY.exec(address)?.[1];
  return AGENT_EMAILS.includes(address) || (!!login && AGENT_GITHUB_LOGINS.includes(login)) || AGENT_NAMES.includes(name.toLowerCase());
}
