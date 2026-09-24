import type { Configuration } from 'electron-builder';
import { APP_ID } from './src/main/appInfo.ts';

/**
 * Installers. `npm run dist` builds the current OS's into dist/; releases are
 * built on macOS, Windows and Linux by .github/workflows/release.yml.
 *
 * Builds are signed only when electron-builder's signing variables name a
 * certificate (CSC_LINK or CSC_NAME; see electron.build/code-signing). Without
 * one the macOS app is still signed ad hoc: Apple silicon won't run unsigned code.
 */
const signed = Boolean(process.env.CSC_LINK || process.env.CSC_NAME);

const config: Configuration = {
  appId: APP_ID,
  productName: 'Console Editor',
  copyright: 'Copyright © 2026 olehwebdev',
  directories: { output: 'dist', buildResources: 'build' },
  // electron-vite bundles everything the app runs (dependencies included) into out/.
  files: ['out/**/*', '!node_modules/**/*'],
  // The icon is also given to GTK (Linux About dialog), which can't read inside app.asar.
  asarUnpack: ['out/main/chunks/*.png'],
  npmRebuild: false,
  // Uploads are the release workflow's job; this also leaves out auto-update metadata.
  publish: null,
  electronFuses: {
    runAsNode: false,
    enableNodeOptionsEnvironmentVariable: false,
    enableNodeCliInspectArguments: false,
    enableEmbeddedAsarIntegrityValidation: true,
    onlyLoadAppFromAsar: true,
    // The site view keeps logins; store its cookies encrypted, as Chrome does. Not yet in ad-hoc signed Mac
    // builds: their Keychain access is tied to each build's own signature, so every update would ask for
    // the login password, and refusing would drop the logins. (Mac apps are only built on macOS.)
    // Turning it on later is safe: plain cookies get encrypted as they're written.
    enableCookieEncryption: signed || process.platform !== 'darwin',
    // grantFileProtocolExtraPrivileges stays on: the editor UI is loaded from file:// and starts module workers there.
  },

  mac: {
    target: [{ target: 'dmg', arch: ['arm64', 'x64'] }],
    category: 'public.app-category.developer-tools',
    artifactName: 'console-editor-${version}-mac-${arch}.${ext}',
    identity: signed ? undefined : '-',
    // Helpers get the same entitlements: Chromium captures media in a helper process.
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    // Shown when a site asks for these; without them macOS ends the app instead of asking.
    extendInfo: {
      NSCameraUsageDescription: 'A website open in Console Editor wants to use the camera.',
      NSMicrophoneUsageDescription: 'A website open in Console Editor wants to use the microphone.',
      NSLocationUsageDescription: 'A website open in Console Editor wants to know your location.',
      NSLocationWhenInUseUsageDescription: 'A website open in Console Editor wants to know your location.',
      NSLocalNetworkUsageDescription: 'Console Editor opens websites on your local network when you ask it to.',
    },
  },
  dmg: { writeUpdateInfo: false },

  win: {
    target: ['nsis'],
    artifactName: 'console-editor-${version}-win-${arch}-setup.${ext}',
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    differentialPackage: false,
    // Overrides and drafts are yours: uninstalling keeps them.
    deleteAppDataOnUninstall: false,
  },

  linux: {
    target: ['AppImage', 'deb', 'rpm', 'tar.gz'],
    category: 'Development',
    executableName: 'console-editor',
    icon: 'build/icons',
    synopsis: 'Live-patch the JavaScript, CSS and HTML of any website',
    maintainer: 'olehwebdev <10379680+olehwebdev@users.noreply.github.com>',
    // Names the .desktop file after package.json's desktopName, which Electron uses as the window's app id.
    syncDesktopName: true,
    artifactName: 'console-editor-${version}-linux-${arch}.${ext}',
  },
  // Without it, electron-builder's desktop entry would start the AppImage with the sandbox off. Its launcher
  // still falls back to that by itself where the system blocks user namespaces.
  appImage: { executableArgs: [] },
  // Distribution packages keep their own naming conventions. Their dependencies are electron-builder's
  // defaults plus ALSA and GBM, which Electron links against but minimal systems may lack.
  deb: {
    artifactName: '${name}_${version}_${arch}.${ext}',
    packageCategory: 'devel',
    depends: ['libgtk-3-0', 'libnotify4', 'libnss3', 'libxss1', 'libxtst6', 'xdg-utils', 'libatspi2.0-0', 'libuuid1', 'libsecret-1-0', 'libasound2', 'libgbm1'],
  },
  rpm: {
    artifactName: '${name}-${version}.${arch}.${ext}',
    packageCategory: 'Development/Tools',
    depends: [
      'gtk3',
      'libnotify',
      'nss',
      'libXScrnSaver',
      '(libXtst or libXtst6)',
      'xdg-utils',
      'at-spi2-core',
      '(libuuid or libuuid1)',
      '(libsecret or libsecret-1-0)',
      '(alsa-lib or libasound2)',
      '(mesa-libgbm or libgbm1)',
    ],
    // Electron's prebuilt binaries have fixed build ids; the /usr/lib/.build-id links rpm would add for
    // them clash with every other package built on the same Electron.
    fpm: ['--rpm-rpmbuild-define=_build_id_links none'],
  },
};

export default config;
