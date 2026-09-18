# Contributing

## Branches

- main: stable/demo-ready
- develop: integration
- feature/<task-name>: temporary feature work

## Workflow

1. Pull the latest develop branch.
2. Create a feature branch when making an isolated change.
3. Implement and test the change.
4. Commit with a clear message.
5. Push the feature branch.
6. Open a pull request into develop.

## Commit Style

Use prefixes such as:

- feat:
- fix:
- refactor:
- docs:
- test:
- chore:

Examples:

feat: add tender document parser
fix: handle empty PDF extraction
docs: update RAG architecture
chore: update dependencies

## Database

All schema changes belong in:
supabase/migrations/

Do not commit credentials.

## Pull Requests

A PR should explain:
- what changed
- why it changed
- how it was tested
- any assumptions or limitations
