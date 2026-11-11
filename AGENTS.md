# Git auto-commit rules

After completing every coding task in this project, create a Git commit without waiting for the user to ask.

## Workflow

1. Review `git status` and inspect all task-related changes with `git diff`.
2. Run relevant tests, lint, and type checks when available, and fix any issues.
3. Stage only files related to the current task; never use `git add .` blindly or include unrelated user changes.
4. Create a commit with a meaningful Conventional Commit message.
5. After committing, report the commit hash and message.

Do not commit unfinished or broken work. If tests fail, explain the failure and do not commit. Never amend previous commits unless explicitly requested, and never push to a remote unless explicitly requested.

Use these Conventional Commit types:

- `feat`: add new functionality
- `fix`: fix a bug
- `refactor`: improve code structure
- `docs`: update documentation
- `test`: add or update tests
- `chore`: maintenance
