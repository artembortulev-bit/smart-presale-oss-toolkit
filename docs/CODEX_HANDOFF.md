# Codex Handoff

Smart Presale OSS Toolkit is a B2B presale workflow reference implementation.

## Current Shape

The project contains useful vertical slices:

- import/catalog foundation;
- deterministic selection logic;
- client request flow;
- proposal draft and PDF pipeline;
- cost benchmark layer;
- scene/placement foundation;
- role-separated demo contours;
- 3D registry foundation.

## Main Gaps

- Runtime still has generated/file-store areas.
- Full auth/users/roles are not complete.
- Manager workspace needs hardening.
- Proposal lifecycle and versioning need continued work.
- Sales handoff and event analytics need expansion.

## Product Center

```text
Client Request -> Qualification -> Recommendation -> Scene -> Proposal -> Handoff
```

## Read First

- `docs/ARCHITECTURE.md`
- `docs/DEMO.md`
- `docs/ROADMAP.md`
- `docs/OSS_READINESS_AUDIT.md`
- `prisma/schema.prisma`
- `src/application/selection`
- `src/application/client-intake`
- `src/application/proposals`
- `src/application/scene-projects`
- `src/app/admin`
- `src/app/client`
