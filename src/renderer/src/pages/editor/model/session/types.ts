/** What the app's event bridge asks of the session: reopen it at start, keep it synced, write it on close. */
export interface PageSession {
  restore(): Promise<void>;
  startSync(): () => void;
  flush(): Promise<boolean>;
}
