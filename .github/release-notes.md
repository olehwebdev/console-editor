## Download

| System | File |
|---|---|
| **macOS**, Apple silicon | `console-editor-{{version}}-mac-arm64.dmg` |
| **macOS**, Intel | `console-editor-{{version}}-mac-x64.dmg` |
| **Windows**, x64 | `console-editor-{{version}}-win-x64-setup.exe` |
| **Windows**, ARM | `console-editor-{{version}}-win-arm64-setup.exe` |
| **Ubuntu, Debian** | `console-editor_{{version}}_amd64.deb` · `_arm64.deb` |
| **Fedora, openSUSE** | `console-editor-{{version}}.x86_64.rpm` · `.aarch64.rpm` |
| **Other Linux** | `.AppImage` or `.tar.gz` (x64 and arm64) |

These builds aren't signed with a publisher certificate yet, so the first launch needs one extra step:

- **macOS**: open the app, then go to **System Settings › Privacy & Security** and click **Open Anyway**.
- **Windows**: if SmartScreen says it protected your PC, click **More info › Run anyway**.
- **Linux AppImage**: `chmod +x` the file first. On Ubuntu 24.04 and later, use the `.deb`: it installs the AppArmor profile Chromium's sandbox needs there.

`SHA256SUMS.txt` lists every file's checksum (`sha256sum -c SHA256SUMS.txt --ignore-missing`).
