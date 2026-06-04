# Product Cost Matrix Layer

## Scope

This layer imports a separate workbook with historical product costs and client prices.

It is not the same thing as the future raw material matrix.

- current workbook = product cost matrix / historical pricing benchmark
- future workbook = raw material matrix for bottom-up manufacturing calculation

These two sources should stay separate in the architecture.

## Modules

- import parser:
  - `src/import/costs/import-product-cost-workbook.ts`
- cost engine:
  - `src/application/costing/product-cost-engine.ts`

## Generated artifacts

- `generated/product-cost-matrix.json`
- `generated/product-cost-report.json`

## What the parser extracts

- normalized article
- name
- category
- optional section / series
- size label
- client price variants
- direct cost variants
- cost note / cost date

The `Neo-Eco` sheet is treated as a special multi-material ladder:

- `PINE`
- `LARCH`
- `ROBINIA`

and formula-derived prices are preserved when the workbook stores them via Excel formulas.

## Rule hierarchy

When a product has no direct cost row, the engine infers cost from historical benchmarks using this order:

1. `series_material`
2. `category_prefix_material`
3. `category_material`
4. `category`
5. `global`

Each rule stores:

- sample count
- median `cost / price`
- inverse `price / cost`
- min/max spread

## Catalog enrichment

Merged catalog products receive a `costing` block with:

- availability: `DIRECT | INFERRED | NONE`
- confidence and confidence label
- default material
- default cost
- default client price
- gross margin
- material-specific variants

## Commercial use

The proposal builder now keeps internal commercial metrics:

- line cost
- subtotal cost
- gross margin

These metrics are available in the draft structure for backoffice logic and later admin UX, but are not rendered into the customer-facing PDF by default.
