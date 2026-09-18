# Agent Instructions

Read CLAUDE.md before making changes.

## Core Rules

1. Inspect the repository before editing.
2. Do not invent project requirements.
3. Do not expose or commit secrets.
4. Do not modify production configuration unnecessarily.
5. Do not change database schema without a migration.
6. Do not invent standards, regulations, certifications, or source citations.
7. Keep changes focused and easy to review.
8. Prefer existing project patterns over introducing new patterns.
9. Run relevant tests/checks before reporting work as complete.

## Git

- Work primarily from develop.
- Use feature branches for isolated support tasks.
- Do not push directly to main.
- Do not force-push shared branches.
- Keep commits understandable.

## Security

Never commit:
- .env files
- API keys
- Supabase service-role keys
- database passwords
- AWS credentials
- access tokens
- private certificates

## AI Output

For standards recommendations:
- provide source evidence
- preserve standard identifiers and metadata
- indicate uncertainty when evidence is insufficient
- never fabricate missing information
