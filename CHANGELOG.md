# Changelog

## 0.1.3 — 2026-05-17

Repository relocation + registry migration.

- **New home**: moved from `overengineered-solutions/oes-project-testing` (private monorepo) to its own public repo at `overengineered-solutions/workspace-bridge`. Resolves the public-package-in-private-repo doctrine violation tracked at oes-project-testing#8.
- **Registry**: now publishes to **npmjs.org** (public, MIT-licensed) instead of GitHub Container Registry. Consumers can install with zero auth via `pnpm add @overengineered-solutions/workspace-bridge`; no `.npmrc` registry override needed.
- **Provenance**: every published artifact carries a Sigstore-backed attestation linking it to the exact GitHub Actions workflow run + commit that built it. Verifiable via `npm audit signatures` or the npmjs package page's "Provenance" badge.
- **License**: `UNLICENSED` (private-monorepo placeholder) → `MIT` for the public release.
- No API changes from 0.1.2.

## 0.1.2 — 2026-05-17

- `<WorkspaceBridge />` now always renders a `<meta name="oes-workspace-bridge" content="active|inactive" data-session-set="…" data-bridge-version="…">` tag so operators can `curl <previewUrl> | grep oes-workspace-bridge` to diagnose "bridge not attached" in the OES workspace IDE.
- New `WORKSPACE_BRIDGE_VERSION` export — surfaced in the meta's `data-bridge-version` attribute for drift detection across iframe deploys.
- README: documents the meta-tag diagnostic flow + a HITRUST privacy contract section enumerating what the bridge does and does NOT forward.

## 0.1.0 — 2026-05-17

Initial release, extracted from primopicks's inline workspace-IDE wiring.

- `isWorkspaceSandbox()` env-gate helper
- `<WorkspaceBridge />` server component
- `buildWorkspaceCsp` / `buildWorkspaceCspExtensions` CSP helpers
- `workspaceSecurityHeaders` X-Frame-Options filter
- `DEFAULT_BRIDGE_SCRIPT_URL` constant
