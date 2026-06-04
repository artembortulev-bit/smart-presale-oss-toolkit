# Product Truth Foundation

Product Truth Foundation turns catalog records into placement-ready and recommendation-ready product facts.

## Generated Outputs

The foundation layer can produce generated artifacts such as:

- product truth records;
- first-wave placement candidates;
- quality flags;
- asset readiness metadata.

Generated files must be reviewed before publication. Public OSS commits should include only demo-safe outputs.

## What A Canonical Record Contains

- `source` - category, series, materials, age range, dimensions, price, and source references.
- `derived` - footprint, safety envelope, compatibility tags, placement contexts.
- `inferred` - product kind, placement role, usage tags, material tags, scores.
- `assets` - 3D status, preview status, DWG/web-ready model status.
- `commercial` - price and cost benchmark availability.
- `quality` - score, status, flags, placement readiness.

## Safety Envelope

When a product has no manual safety asset, the system can infer a preliminary safety envelope through deterministic rules.

This is not engineering certification. It is a reproducible presale foundation for placement, scene planning, and future compatibility checks.

## First Wave

The first wave should prefer products with:

- complete dimensions;
- usable safety envelope;
- image or preview readiness;
- cost readiness;
- relevant category priority for presale and scene workflows.

## Value

The layer supports:

- placement-ready product subsets;
- quality flags;
- scene editor foundations;
- object compatibility;
- future auto-layout and collision rules.
