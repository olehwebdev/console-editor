import type { LogRowProps } from './types';

/** How many of a commit's components weren't listed (a commit lists up to the recorder's most). */
export function MoreRow({ commit }: LogRowProps) {
  return <span className="flex h-full items-center pl-6 text-[12px] text-fg-subtle">{commit.more} more not listed</span>;
}
