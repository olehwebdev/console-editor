export interface ChangelogEntry {
  /** "1.2.0", or "Unreleased". */
  version: string;
  /** ISO date from the heading, if any. */
  date: string | null;
  /** Markdown of the section, without its heading. */
  body: string;
}
