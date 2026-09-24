import { changelogSection } from '../../../shared/changelog';
import type { UpdateServiceOptions } from './types';

/** The version's CHANGELOG section, read from the release's tag; '' when it can't be had. */
export async function fetchNotes({ fetch, endpoints }: UpdateServiceOptions, version: string): Promise<string> {
  try {
    const res = await fetch(endpoints.changelog(version));
    if (!res.ok) return '';
    return changelogSection(await res.text(), version)?.body ?? '';
  } catch {
    return '';
  }
}
