export interface FileWatcherDeps {
  /** The folder of override files. */
  dir: string;
  /** The id of the override a file in `dir` holds the content of, or null for any other file. */
  idOf(name: string): string | null;
  /** The overrides to check when the platform doesn't say which file changed. */
  ids(): string[];
  /** Takes an override's file as it is on disk: true when another editor changed it. */
  take(id: string): Promise<boolean>;
  /** Overrides whose file another editor changed, once they are served as it is. */
  onEdited(ids: string[]): void;
}
