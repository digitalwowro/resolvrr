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
