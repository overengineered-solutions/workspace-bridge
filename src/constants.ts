/**
 * Package version. Surfaced in the `<meta data-bridge-version="…">`
 * tag that `<WorkspaceBridge />` renders so consumers + OES parent
 * panels can detect version drift across iframe deploys without
 * inspecting npm metadata. Bump in lockstep with `package.json`.
 */
export const WORKSPACE_BRIDGE_VERSION = "0.2.0";

/**
 * Built-in fallback URL for the iframe-side bridge script when the
 * `OES_BRIDGE_SCRIPT_URL` env var is not set. Points at the OES app
 * deployment (`app.overengineeredsolutions.org`), which serves
 * `/oes-ide-bridge.js` from `src/app/oes-ide-bridge.js/route.ts` with
 * `Access-Control-Allow-Origin: *` so any sandbox origin can load it.
 *
 * Override at runtime by setting `OES_BRIDGE_SCRIPT_URL` on the
 * sandbox env (OES does this at bind time), or per-render via
 * `<WorkspaceBridge scriptSrc="…" />` when targeting a preview/staging
 * bridge.
 *
 * Re-exported for back-compat with v0.1.x; prefer `resolveBridgeScriptUrl()`
 * when you need the env-aware value.
 */
export const DEFAULT_BRIDGE_SCRIPT_URL =
  "https://app.overengineeredsolutions.org/oes-ide-bridge.js";

/**
 * Built-in fallback allowlist of origins permitted to iframe-embed a
 * workspace dev server when the `OES_WORKSPACE_PARENT_ORIGINS` env var
 * is not set. Covers OES prod (`app.` subdomain + apex redirect target)
 * + every Vercel preview deploy. The CSP `frame-ancestors` directive
 * uses this set when workspace mode is on.
 *
 * v0.1.x shipped only `https://*.vercel.app` and the apex
 * `https://overengineeredsolutions.org` — which silently broke prod
 * because the actual deployment is at `https://app.overengineeredsolutions.org`,
 * and browsers strict-match origins in `frame-ancestors` (no implicit
 * subdomain coverage). v0.2.0 adds the `app.` subdomain to the fallback
 * AND makes the whole list env-driven via
 * `OES_WORKSPACE_PARENT_ORIGINS` so future origins (tenant-2,
 * staging-of-staging, etc.) need zero package bumps.
 */
const FALLBACK_PARENT_ORIGINS = [
  "https://*.vercel.app",
  "https://app.overengineeredsolutions.org",
  "https://overengineeredsolutions.org",
] as const;

/**
 * Resolve the `frame-ancestors` allowlist at runtime.
 *
 * Env chain (first hit wins):
 *   1. `OES_WORKSPACE_PARENT_ORIGINS` — comma-separated origins set by
 *      OES's `buildIdeSandboxEnv` at sandbox-bind time. Lets the
 *      platform add new parent origins (preview-of-staging, tenant-2,
 *      branded subdomains) without a package bump in every consumer.
 *   2. Built-in defaults — prod app subdomain + apex + Vercel preview wildcard.
 *
 * Read fresh on each call so server-rendered pages reflect current
 * process state. Empty-string entries are dropped defensively.
 */
export function resolveWorkspaceParentOrigins(): readonly string[] {
  const fromEnv = process.env.OES_WORKSPACE_PARENT_ORIGINS;
  if (fromEnv && fromEnv.trim().length > 0) {
    const parsed = fromEnv
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (parsed.length > 0) return parsed;
  }
  return FALLBACK_PARENT_ORIGINS;
}

/**
 * Resolve the iframe-side bridge script URL at runtime.
 *
 * Env chain (first hit wins):
 *   1. `OES_BRIDGE_SCRIPT_URL` — explicit override set on the sandbox
 *      env. Lets the platform point at a staging bridge or a versioned
 *      asset (`…?v=N`) without re-publishing the npm package.
 *   2. `DEFAULT_BRIDGE_SCRIPT_URL` built-in.
 */
export function resolveBridgeScriptUrl(): string {
  const fromEnv = process.env.OES_BRIDGE_SCRIPT_URL;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();
  return DEFAULT_BRIDGE_SCRIPT_URL;
}
