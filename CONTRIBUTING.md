# Contributing

Thank you for considering a contribution to Smart Presale OSS Toolkit.

## Scope

This repository is a reference implementation for operational B2B presale workflows. Contributions should strengthen the process layer:

- client intake;
- qualification;
- recommendation sets;
- scene/project context;
- proposal lifecycle and versioning;
- sales actions and outcomes;
- manager workspace;
- demo-safe reproducibility.

Avoid broad rewrites, speculative AI/RAG additions, or visual redesigns that do not improve the presale workflow.

## Before Opening A PR

1. Keep changes narrow and reversible.
2. Do not include secrets, `.env`, private customer data, local absolute paths, or private assets.
3. Preserve process semantics and status invariants.
4. Run the relevant checks:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

5. If your change touches demo DB flows, document any required seed/reset step.

## Data And Assets

Generated artifacts and 3D assets must be demo-safe before publication. Do not commit production catalogs, private 3D sources, large production previews, customer files, or local verification output.

## Pull Request Expectations

Use the PR template. Clearly separate:

- what changed;
- touched modules;
- schema/migration impact;
- manual verification;
- risks;
- out of scope.
