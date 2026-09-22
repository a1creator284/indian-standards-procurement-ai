# Contributing

Thanks for contributing to IS Copilot.

## Before making changes

- Read the project README and understand the retrieval/ranking pipeline before changing recommendation logic.
- Keep demo-mode behavior deterministic and offline-friendly.
- Do not introduce claims that the demo dataset is an official BIS catalogue or that recommendations are authoritative.

## Development

1. Create a focused branch for your change.
2. Install dependencies with `npm install`.
3. Run linting, type checking, tests, and the production build before opening a pull request.
4. Keep changes focused and document user-visible behavior.

## Pull requests

Include:
- what changed and why;
- tests or validation performed;
- any changes to configuration or environment variables;
- screenshots for meaningful UI changes.

For ranking or retrieval changes, add or update a regression test where practical.
