/** Reads a key of an app's Info.plist, XML or binary: `plutil -extract <key> raw -o - <plist>`. */
export const PLUTIL = { program: 'plutil', extract: '-extract', raw: 'raw', stdout: ['-o', '-'], versionKey: 'CFBundleShortVersionString', plist: 'Contents/Info.plist' } as const;

/** Reads a program's file version with PowerShell: the script around the path, given as a single-quoted literal. */
export const POWERSHELL = {
  program: 'powershell.exe',
  args: ['-NoProfile', '-NonInteractive', '-Command'],
  before: "(Get-Item -LiteralPath '",
  after: "').VersionInfo.ProductVersion",
  quote: "'",
} as const;

/** A Flatpak app is started through `flatpak run`; the markers around forwarded files aren't for asking its version. */
export const FLATPAK = { program: 'flatpak', markers: ['@@u', '@@'] as readonly string[] } as const;
