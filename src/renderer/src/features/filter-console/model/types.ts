import type { ConsoleLevel } from '@common/types';

export interface ConsoleFilter {
  /** Frames shown, by `frameKey`; empty: all of them. */
  frameKeys: string[];
  /** Levels shown, for the page's own rows (code you ran and page loads always show). */
  levels: Record<ConsoleLevel, boolean>;
  /** Shown rows contain this, ignoring case. */
  text: string;
  /** Rows before the top page's last load stay, as DevTools' "Preserve log". */
  preserveLog: boolean;

  toggleFrame(key: string): void;
  showAllFrames(): void;
  toggleLevel(level: ConsoleLevel): void;
  setText(text: string): void;
  togglePreserveLog(): void;
}
