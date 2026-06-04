# Smart Presale OSS Toolkit

Smart Presale OSS Toolkit is an early open-source reference implementation for B2B presale and sales workflow automation.

It is not a closed commercial site or a production customer database. The public version is intended to show how a presale process can connect client intake, qualification, deterministic recommendations, scene context, proposal versions, sales actions, and manager workspace state.

## Problem

B2B presale teams often manage requests, recommendations, proposal drafts, and follow-up actions across disconnected files, catalogs, and CRM notes. This project demonstrates a more operational shape:

```text
Client Request -> Qualification -> Recommendation Set -> Scene Project -> Proposal -> Proposal Version -> Sales Action / Outcome
```

## Who It Is For

- B2B product teams building presale tooling.
- Sales engineering teams that need explainable recommendations and proposal state.
- Developers studying operational workflow design with Next.js, Prisma, and deterministic business logic.
- OSS maintainers evaluating how Codex can help with review, tests, docs, and release hygiene.

## Core Features

- Client intake flow for project requests.
- Rule-based recommendation and solution selection.
- Cost benchmark layer for internal commercial reasoning.
- Proposal draft and PDF export pipeline.
- Persisted proposal versioning model.
- Manager workspace and sales action flow.
- Demo-readiness flow with reset/seed/verify commands.
- 3D visual proof foundation for limited demo-safe showcase assets.
- Prisma/PostgreSQL operational core with generated read models where the runtime is still transitional.

## Architecture Overview

The implementation is organized around stable product boundaries:

- `src/app` - Next.js routes, pages, and API endpoints.
- `src/application` - business logic for selection, client intake, proposals, costing, scene projects, and manager workspace.
- `src/infrastructure` - config, database access, generated read models, and runtime wiring.
- `src/ui/components` - UI components.
- `prisma` - schema, migrations, and seed logic.
- `generated` - local generated artifacts. Public OSS commits should include only demo-safe generated files.
- `docs` - architecture, demo, roadmap, and OSS notes.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the public architecture notes and invariants.

## Quick Start

Requirements:

- Node.js 20 or newer.
- npm.
- Optional PostgreSQL for DB-backed flows.

```bash
npm ci
cp .env.example .env
npm run prisma:generate
npm run typecheck
npm run lint
npm run test
npm run build
npm run dev
```

Open `http://localhost:3000`.

For DB-backed demo flows, configure `DATABASE_URL` in `.env`, then use the documented demo commands in [docs/DEMO.md](docs/DEMO.md). Destructive seed/reset commands are guarded and should be used only for local demo data.

## Demo Flow

The main demonstration path is:

1. Open the manager queue.
2. Inspect a new client request.
3. Review qualification and recommendation state.
4. Open proposal and PDF version.
5. Record a sales action or outcome.
6. Optionally open the 3D visual proof showcase when demo-safe assets are available.

Detailed instructions are in [docs/DEMO.md](docs/DEMO.md).

## Public / Private Boundary

The OSS version may include:

- source code;
- Prisma schema and migrations;
- documentation;
- tests;
- scripts;
- demo-safe seed data;
- small demo-safe assets.

The OSS version must not include:

- `.env` or local secrets;
- real customer or commercial data;
- private Windows paths;
- private 3D databases;
- large production assets;
- internal documents that have not been cleaned;
- local verification artifacts.

See [docs/OSS_READINESS_AUDIT.md](docs/OSS_READINESS_AUDIT.md).

## Project Status

Early OSS toolkit / reference implementation.

The project has meaningful vertical slices, but it is not presented as a finished SaaS product. Current strengths are the presale process model, deterministic recommendation flow, proposal/versioning foundation, and manager workspace direction. Current gaps are documented in [docs/ROADMAP.md](docs/ROADMAP.md).

## Contributing

Contributions should preserve the process invariants and avoid hidden runtime writes. Start with [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

Do not open issues that contain secrets, credentials, real customer data, or private assets. See [SECURITY.md](SECURITY.md).

## License

Apache License 2.0. See [LICENSE](LICENSE).

## Maintainer Note

This repository is being prepared as a public OSS package from an internal B2B presale prototype. Some runtime code may still contain brand-specific strings or transitional generated-read-model assumptions. Treat those as documented cleanup items, not as public data authorization.
