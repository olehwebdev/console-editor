# Security policy

## Supported versions

Only the latest release gets security fixes. Installed copies look for new releases when they start and every six hours, so please update (**Help › Check for Updates…**) and check the problem is still there before reporting it.

## Reporting a vulnerability

Please **don't open a public issue**. Report it privately on GitHub instead: **[Security › Report a vulnerability](https://github.com/olehwebdev/console-editor/security/advisories/new)**. Only the repository's maintainers see the report, and you can follow it there.

Say what an attacker can do and how, as precisely as you can:

- the version (**Help › About**, or **Console Editor › About Console Editor** on macOS) and your OS;
- the steps, and a page or file that shows it, if the problem needs one;
- what you expected the app to prevent.

Once it's fixed, the fix ships in a release, and the advisory is published with it, crediting you unless you'd rather not be named.

## What counts

How the app keeps the page it shows apart from the editor and your system is described in [docs/SPEC.md › Security](docs/SPEC.md#8-security). Anything that breaks it is a vulnerability, for example:

- a page shown in the app reaching the app's IPC, the editor's windows, files on your disk or the main process;
- a page getting a permission (camera, location, clipboard reads…) without being asked for it, or launching another application without asking;
- text a page or a release chooses (file names, source maps, console output, release notes) running script in the editor;
- another program or website reading the site view's data (cookies, logins) or your overrides, or changing them;
- an update installing something other than the release it came from, or an installed copy that can be started as Node.js, or with a debugging port on its default data folder;
- a Chromium or Electron vulnerability that is fixed upstream while the latest release still ships the affected version.

These are what the app is for, or are known trade-offs, so they aren't vulnerabilities:

- code you run in the console or as an action, and overrides and rules changing what a page does, even when a rule removes its Content-Security-Policy or lets it call other origins: they change only what the app's own browser sees;
- pages reaching addresses on your local network, a trade-off the spec explains;
- a GitHub release that was itself tampered with: builds aren't signed yet, so updates are checked against the release they come from;
- security problems in the websites you open.
