# Operational Foundation

This document describes the operational foundation for requests, qualification, saved recommendations, internal users, and audit trail.

## DB-Backed Areas

- New client requests can be written to `ClientRequest`.
- Uploaded file metadata can be written to `ClientRequestAsset`.
- Qualification snapshot can be stored on `ClientRequest`.
- Recommendation sets can be stored in `SelectionSession` and `SelectionRecommendation`.
- Internal employee identity is represented by `User`.
- Audit events are represented by `EventLog`.

Catalog, product truth, costing reports, and 3D registry may still use generated read models.

## Local Setup

1. Start PostgreSQL.
2. Copy `.env.example` to `.env`.
3. Set `DATABASE_URL` for your local database.
4. Apply migrations:

```bash
npm run prisma:migrate
```

5. Check DB readiness:

```bash
npm run db:health
```

## Smoke Test

```bash
npm run prisma:generate
npm run typecheck
npm run test
npm run build
```

Manual check:

- open the client intake route;
- create a demo request;
- open the request workspace;
- reload it;
- confirm duplicate recommendation sessions are not created.

## Idempotency

- `ClientRequest.reference` is unique.
- Request save operations should be idempotent.
- Primary recommendation sessions should use stable dedupe keys.
- Audit events should use dedupe keys for important process events.

## Seed Safety

The normal seed command is intentionally guarded. Destructive local demo reset must be explicit and must not run against production or shared data.

## Out Of Scope

- Full production auth.
- CRM integrations.
- AI/RAG/vector search.
- Full catalog migration from generated read model to DB runtime.
- Visual redesign.
