# Dependency Updates

Dependabot is enabled for npm package updates and GitHub Actions updates.
It is configured to ignore semver-major version updates for both ecosystems.

Dependabot-authored pull requests are review inputs. Do not merge bot-authored
commits directly unless the repository owner explicitly approves that specific
PR.

For important dependency updates, inspect the Dependabot PR, then recreate the
dependency changes on a normal topic branch with the repo-local Git identity:

```text
Razvan Rosca <razvan.rosca@gmail.com>
```

Run the normal checks and CI on the human-authored update. After that update is
merged, close the corresponding Dependabot PR.

Normal CI validates application behavior for every pull request and push to
`main`. The separate dependency-audit workflow runs only when `package.json` or
`package-lock.json` changes, and it can also be started manually. This keeps a
newly published advisory from making unrelated application changes appear
broken while still requiring dependency changes to pass
`npm audit --audit-level=moderate`.
