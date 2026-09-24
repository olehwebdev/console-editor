## Download

| System | File |
|---|---|
| **macOS**, Apple silicon | `console-editor-{{version}}-mac-arm64.dmg` |
| **macOS**, Intel | `console-editor-{{version}}-mac-x64.dmg` |
| **Windows**, x64 | `console-editor-{{version}}-win-x64-setup.exe` |
| **Windows on ARM** | `console-editor-{{version}}-win-arm64-setup.exe` |
| **Ubuntu, Debian** | `console-editor_{{version}}_amd64.deb` · `_arm64.deb` |
| **Fedora, openSUSE** | `console-editor-{{version}}.x86_64.rpm` · `.aarch64.rpm` |
| **Other Linux** | `.AppImage` or `.tar.gz` (x64 and arm64) |

Already have Console Editor 0.2.0 or later? It tells you about this release by itself. On Windows and with the AppImage, `.deb` or `.rpm`, click **Download and install**, then **Restart to update** (the `.deb` and `.rpm` ask for your password); on macOS it downloads and checks the disk image for you.

The disk images, the Windows installers and the `.deb` packages were each installed and tested on a machine of their architecture before this release was drafted, and an installed Windows app and AppImage were updated to a newer build.

### First launch

These builds aren't signed with a publisher certificate yet, so your system asks before running them:

- **macOS:** drag the app to Applications and open it, then click **Open Anyway** in **System Settings › Privacy & Security**. If macOS says the app is damaged instead, run `xattr -dr com.apple.quarantine "/Applications/Console Editor.app"`. Each new version asks again, as do sites' camera, microphone and location permissions.
- **Windows:** if SmartScreen says it protected your PC, click **More info › Run anyway**. With Smart App Control on, Windows blocks unsigned apps with no way to allow just this one.
- **Linux:** on Ubuntu 24.04 and later, use the `.deb`: it installs the AppArmor profile Chromium's sandbox needs there. An AppImage needs `chmod +x` and the FUSE 2 library (`libfuse2`, or `libfuse2t64` on Ubuntu 24.04 and later; `fuse-libs` on Fedora).

`SHA256SUMS.txt` lists every file's checksum (`sha256sum -c SHA256SUMS.txt --ignore-missing`).
