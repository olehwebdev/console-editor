# Rulesets

GitHub rulesets that protect `main` and the release tags. GitHub doesn't read these files: they are the source to import, and the record of what is set. Keep them in step with **Settings › Rules › Rulesets**.

To apply one: **Settings › Rules › Rulesets › New ruleset › Import a ruleset**, pick the file, review, **Create**. To change one later, edit it there and here in the same change.

## `main.json`: Protect main

| Rule | Why |
|---|---|
| Changes only through a pull request | CI runs on pull requests (and on `main`), not on pushes to other branches: a pull request is how a change gets checked before it lands |
| `Typecheck, lint and test` must pass, from GitHub Actions | The CI job in `ci.yml`. Pinned to GitHub Actions (app 15368), so a status with the same name posted by a person or another app (the Claude app included) doesn't count. What the job runs is still up to the pull request: see below |
| The branch must be up to date with `main` | CI then checks what `main` will actually hold: two changes that each pass on their own can still break together. Bringing a `release/` or `hotfix/` branch up to date merges `main` into it, which is why its release is drafted from the version commit before that ([CONTRIBUTING › Releasing](../../CONTRIBUTING.md#releasing)) |
| Review conversations resolved | Every review thread on the code, a bot's included, is resolved before merging |
| No force pushes, no deleting `main` | |
| Merge, squash or rebase all allowed | `release/` and `hotfix/` branches merge with a merge commit ([CLAUDE.md › Branches](../../CLAUDE.md#branches-git-flow)), so there is no linear-history rule |

What the rules can't stop:

- **A pull request that weakens its own check.** CI on a pull request runs that pull request's `ci.yml`, `package.json` scripts and test config. A change that stubs a script, skips the job (a skipped job counts as passed) or adds a workflow reporting `Typecheck, lint and test` gets a green check from GitHub Actions. Nothing on a personal GitHub Free repository pins this: required workflows are for Enterprise Cloud organizations, rules that block file paths need a paid plan and a private repository, and code owner review needs an approval the only maintainer can't give their own pull request. The gate is the maintainer's merge: read changes to `.github/`, `package.json` scripts and test config before merging. Agents could merge through the API too (it needs only the access they push with); `CLAUDE.md` tells them not to.

Deliberately left out:

- **No bypass.** Claude sessions push to GitHub as the maintainer, who is the repository's admin, so a bypass for the admin role (or for the maintainer) would cover agents' pushes to `main` too. To get past the rules in an emergency, set the ruleset's enforcement to **Disabled** in Settings, then turn it back on. Changing a ruleset needs the Administration permission. Cloud sessions reach GitHub through the Claude GitHub app, which lacked it when this was written: reading branch protection through it, which needs Administration (read), returned 403. A session using your own credentials, such as a local `gh` login, has no such limit.
- **No required approvals.** The maintainer is the only collaborator, every pull request (Claude's too) is opened as the maintainer, and GitHub doesn't let authors approve their own pull requests: one required approval would block every merge. Raise it when a second maintainer joins.
- **No signed commits.** The maintainer's commits aren't signed, agents' included (they commit as the person they work for), and a merge commit brings a branch's commits into `main` as they are, so requiring signatures would block the maintainer's pull requests and release branches.
- **No merge queue.** GitHub offers it only in organization-owned repositories, and `ci.yml` doesn't run on `merge_group` either.

## `release-tags.json`: Release tags are permanent

`v*` tags can't be moved or deleted. Installed copies read their release notes from the tag (`CHANGELOG.md` at `v<version>`), and a published release's installers and `SHA256SUMS.txt` were built from its commit. A wrong tag isn't fixed by moving it: release the next version.

Creating tags stays open, so publishing a drafted release (which creates its tag) works as before. Restricting it would stop only other collaborators, not agents, which act as the maintainer; `CLAUDE.md` tells agents not to tag. A tag that already exists when its draft is published wins: the release goes on that tag, not on the drafted commit, and the tag can't be moved afterwards. So check that `git ls-remote --tags origin v<version>` prints nothing before publishing ([CONTRIBUTING › Releasing](../../CONTRIBUTING.md#releasing)).

The rule covers tags, not releases: a push token (an agent's too) can still replace a published release's installers and `latest*.yml`, which installed copies update from, or delete the release. Turn on **Settings › General › Releases › Enable release immutability** as well: it locks a published release's assets and tag. It applies to releases published after it's turned on, and fits how releases are made here: the Release workflow uploads everything to a draft, and nothing changes after publishing.
