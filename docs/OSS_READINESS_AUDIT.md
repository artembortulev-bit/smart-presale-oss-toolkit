# OSS Readiness Audit

Audit date: 2026-06-04.

This audit covers the local workspace before preparing Smart Presale OSS Toolkit for a public GitHub repository.

## Safe To Publish After Review

- Source code structure for the platform.
- Prisma schema and migrations, subject to normal review.
- Tests.
- OSS documentation.
- GitHub templates and CI workflow.
- Demo-safe scripts.
- Small demo-safe assets, if explicitly reviewed.

## Not Safe To Publish

- `.env` and any `.env.local` files.
- Local logs and runtime artifacts.
- `tmp`, `artifacts`, and `.visual-3d-pass`.
- Large 3D and preview folders under `public/models` and `public/imported-3d-previews`.
- Generated request data that includes personal contact information.
- Generated 3D registry data that includes local absolute paths.
- Generated catalog/product-truth files that still reference brand-specific production URLs.
- Any local import paths from a developer machine.
- Any internal documents that have not been cleaned.

## Findings

### Environment

`.env` exists locally and includes database/import configuration plus local absolute paths. It must stay ignored.

`.env.example` has been replaced with demo-safe placeholders.

### Local Paths

Private Windows paths were found in old README/docs and generated artifacts. README/docs in the OSS package were cleaned. Runtime code and generated artifacts may still contain local paths and are listed as manual cleanup items.

### Contacts

Generated client request data contains a personal email address. Runtime code also contains demo/local emails and brand-specific contact strings. Generated request data is ignored by default; runtime strings require a separate neutralization pass before publication if the public repository must be fully brand-neutral.

### Generated Artifacts

The `generated` directory contains production-like catalog and 3D registry artifacts. It is ignored by default until reviewed demo-safe artifacts are created.

### 3D Assets

Large OBJ/PNG preview assets were found in public asset folders, including files larger than 300 MB. These folders are ignored by default. Only small demo-safe assets should be explicitly allowed later.

### Brand Boundary

The OSS documentation now positions the project as Smart Presale OSS Toolkit. Some runtime code still contains brand-specific strings. That cleanup was intentionally not performed in this package because runtime behavior and process semantics were out of scope for this pass.

## Cleaned Or Replaced In This Pass

- Public README positioning.
- `.env.example`.
- `.gitignore`.
- Public architecture/demo/roadmap/Codex docs.
- GitHub CI and templates.
- License and OSS policy documents.

## Remaining Risks Before Publication

- Verify whether any generated files are already tracked in git history.
- Create or approve demo-safe generated fixtures if the public repo needs offline demo data.
- Decide whether runtime brand strings should be neutralized before the first public commit.
- Decide whether a small 3D demo asset should be explicitly included.
- Confirm Git is available and inspect `git status` before staging.
