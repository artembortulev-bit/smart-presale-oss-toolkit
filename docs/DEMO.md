# Demo

This document describes the intended local demo flow for Smart Presale OSS Toolkit.

## Prerequisites

- Node.js 20 or newer.
- npm.
- Optional PostgreSQL for DB-backed manager/proposal flows.

## Local Setup

```bash
npm ci
cp .env.example .env
npm run prisma:generate
npm run dev
```

Open `http://localhost:3000`.

## Optional Database Setup

If PostgreSQL is available, configure `DATABASE_URL` in `.env` and run:

```bash
npm run prisma:migrate
npm run db:health
```

For local demo data only:

```bash
npm run demo:reset
npm run demo:seed
npm run demo:verify
```

These commands are intended for local demo state. Do not run destructive reset/seed commands against production or shared data.

## Pages To Open

Depending on the data mode and available demo records:

- `/` - overview.
- `/request-quote` or `/client` - client intake.
- `/admin/manager` - manager queue.
- `/admin/manager/[requestId]` - request workspace.
- `/api/proposals/pdf?proposalVersionId=...` - persisted proposal PDF version.
- `/showcase/3d-visual-confidence` - optional 3D visual proof when demo-safe assets are present.

## Demo Flow

1. Open the manager queue.
2. Select a request that needs review.
3. Review qualification state.
4. Inspect recommendation set and scene context.
5. Open the proposal block.
6. Open the latest persisted PDF version.
7. Record or inspect the next sales action.
8. Record outcome when the flow is ready.
9. Open the 3D visual proof only if demo-safe assets are present.

## Expected Talking Points

- The queue shows process state, not just records.
- A request workspace connects customer context, qualification, recommendation, scene, proposal, versions, and sales action.
- Proposal versions are treated as snapshots.
- Sales follow-through remains visible after a proposal is sent.
- Demo records should not pollute business baseline metrics.

## Demo Data Policy

The public repository should include only demo-safe data. Real customer records, private commercial files, local import paths, and private assets must not be committed.

The current local tree may contain generated artifacts from private/internal sources. Those files are ignored by default and must be replaced with reviewed demo fixtures before public release.
