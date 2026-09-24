/** How the updater's messages start ("Couldn't download the update: "), as the main process words them. */
const TITLE_PREFIX = /^Couldn't [^:]+: /;

/** The updater's message without the "Couldn't …:" a toast has as its title. */
export function reason(message: string): string {
  return message.replace(TITLE_PREFIX, '');
}
