import { APPIMAGE_ENV, detectInstallMethod, type InstallMethod } from '../update/electronInstaller';

/** What a desktop entry starts, by how the copy was installed: nothing where the installer made the entry itself. */
const LAUNCHER: Record<InstallMethod, () => string | undefined> = {
  // Not the executable inside it: the runtime mounts the image in a new folder on every run.
  appimage: () => process.env[APPIMAGE_ENV.image],
  deb: () => undefined,
  rpm: () => undefined,
  nsis: () => undefined,
};

/**
 * The file a desktop entry should start for this packaged Linux copy when no installer made one: the AppImage,
 * or the executable of an unpacked .tar.gz. Undefined for the .deb and .rpm, whose packages install theirs.
 */
export async function launcherPath(): Promise<string | undefined> {
  const method = await detectInstallMethod();
  return method ? LAUNCHER[method]() : process.execPath;
}
