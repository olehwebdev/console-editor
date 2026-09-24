import type { AvailableUpdate } from '../../../shared/types';
import type { AutoInstaller, GitHubRelease } from './types';

/**
 * The update `release` offers: installed by `installer` when this copy has one. Notes that
 * couldn't be fetched fall back to those of the same version offered before, if it was.
 */
export function offeredUpdate(release: GitHubRelease, version: string, notes: string, offered: AvailableUpdate | null, installer: AutoInstaller | null): AvailableUpdate {
  return {
    version,
    notes: notes || (offered?.version === version ? offered.notes : ''),
    releaseUrl: release.html_url,
    install: installer ? 'auto' : 'manual',
    installsOnQuit: !!installer?.installsOnQuit,
  };
}
