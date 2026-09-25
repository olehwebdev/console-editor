import { utimes } from 'node:fs/promises';

/** Updates an icon theme folder's time: icon caches (GTK's, and the dock's through it) tell that a theme changed by it. */
export async function markThemeChanged(theme: string): Promise<void> {
  const now = new Date();
  await utimes(theme, now, now);
}
