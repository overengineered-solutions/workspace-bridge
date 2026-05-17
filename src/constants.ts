/**
 * Package version. Surfaced in the `<meta data-bridge-version="…">`
 * tag that `<WorkspaceBridge />` renders so consumers + OES parent
 * panels can detect version drift across iframe deploys without
 * inspecting npm metadata. Bump in lockstep with `package.json`.
 */
export const WORKSPACE_BRIDGE_VERSION = "0.1.3";

/**
 * Default URL the `<WorkspaceBridge />` component uses for the
 * iframe-side bridge script. Served by oesolutions at
 * `/oes-ide-bridge.js` (see oesolutions's `src/app/oes-ide-bridge.js/route.ts`)
 * with `Access-Control-Allow-Origin: *` so any sandbox origin can
 * load it.
 *
 * Override via `<WorkspaceBridge scriptSrc="…" />` if pointing at a
 * staging / preview / locally-served bridge.
 */
export const DEFAULT_BRIDGE_SCRIPT_URL =
  "https://overengineeredsolutions.org/oes-ide-bridge.js";

/**
 * Origins permitted to iframe-embed a workspace dev server. OES's
 * production domain + every Vercel preview deploy. The CSP
 * frame-ancestors directive uses this set when workspace mode is on.
 */
export const WORKSPACE_PARENT_ORIGINS = [
  "https://*.vercel.app",
  "https://overengineeredsolutions.org",
] as const;
