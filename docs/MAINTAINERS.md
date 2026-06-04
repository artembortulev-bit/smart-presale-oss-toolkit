# Maintainers

## Maintainer Responsibilities

- Keep the public/private data boundary clear.
- Review generated artifacts before they are committed.
- Keep demo reset/seed flows explicit and scoped.
- Preserve process invariants around proposals, versions, sales actions, and read-only routes.
- Keep documentation aligned with actual runtime behavior.

## Release Checklist

Before a public release:

1. Run private-data audit.
2. Confirm `.env` and local paths are not staged.
3. Confirm generated artifacts are demo-safe.
4. Confirm large/private 3D assets are excluded.
5. Run CI checks.
6. Update README, demo docs, and roadmap if behavior changed.
7. Document migration or seed requirements.

## Data Boundary Checklist

Do not publish:

- real customer records;
- production commercial datasets;
- internal documents;
- private 3D sources;
- large production previews;
- local absolute paths;
- secrets or credentials;
- local verification output.

## Communication

Public issues and pull requests should avoid sensitive data. For security-sensitive topics, use a private maintainer channel when available.
