import {
  resolveBridgeScriptUrl,
  resolveWorkspaceParentOrigins,
} from "./constants.js";
import { isWorkspaceSandbox } from "./env.js";

export type WorkspaceCspExtensions = {
  /**
   * Origins to add to the `script-src` directive so the iframe-side
   * bridge script can load. Includes the bridge script's origin.
   */
  scriptSrcOrigins: readonly string[];
  /**
   * Source-list keywords to add to the `script-src` directive. In
   * workspace mode this is `['unsafe-eval', 'wasm-unsafe-eval']` so
   * the consuming app's `pnpm dev` bundle works inside the iframe.
   *
   * Why these are HITRUST-acceptable here:
   *   - Gated on `IDE_SESSION_ID`, set ONLY by OES's `buildIdeSandboxEnv`
   *     at sandbox bind time. Production, preview, staging deploys
   *     never see the env var, so prod CSP stays locked.
   *   - The workspace sandbox is ephemeral, single-tenant, and
   *     network-egress-restricted at the Vercel Sandbox layer to a
   *     workspace allow-list. In-iframe runtime-eval'd JS cannot
   *     exfiltrate beyond that allow-list.
   *   - The relaxation is intrinsic to the dev workflow: React DevTools,
   *     HMR, Turbopack's WASM runtime, and Next.js's source-maps panel
   *     all rely on these keywords. Without them, `pnpm dev` is unusable
   *     inside the iframe and the IDE's "see the live preview" loop
   *     breaks for every consuming repo.
   */
  scriptSrcKeywords: readonly string[];
  /**
   * Replacement value for the `frame-ancestors` directive — permits
   * the OES workspace page to iframe-embed this dev server.
   */
  frameAncestorsDirective: string;
};

const WORKSPACE_DEV_SCRIPT_SRC_KEYWORDS = [
  "'unsafe-eval'",
  "'wasm-unsafe-eval'",
] as const;

/**
 * Pure helper returning the extensions to splice into an existing
 * CSP. Use when the consumer wants full control over its directive
 * order and string formatting (e.g. primopicks's per-request nonce
 * pipeline). For projects without that complexity, prefer
 * `buildWorkspaceCsp` which does the splicing for you.
 *
 * Returns `null` when not in workspace mode (caller should leave CSP
 * untouched).
 *
 * v0.2.0: both origin lists are resolved at call time from env vars
 * (`OES_WORKSPACE_PARENT_ORIGINS`, `OES_BRIDGE_SCRIPT_URL`) with safe
 * fallbacks. No package bump needed to add a new parent origin.
 *
 * v0.3.0: extensions also carry `scriptSrcKeywords` so dev-React in
 * the sandbox iframe stops tripping the missing-`'unsafe-eval'` CSP
 * error. See `WorkspaceCspExtensions.scriptSrcKeywords` for the
 * HITRUST gating rationale.
 */
export function buildWorkspaceCspExtensions(): WorkspaceCspExtensions | null {
  if (!isWorkspaceSandbox()) return null;
  const bridgeOrigin = new URL(resolveBridgeScriptUrl()).origin;
  const parentOrigins = resolveWorkspaceParentOrigins();
  return {
    scriptSrcOrigins: [bridgeOrigin],
    scriptSrcKeywords: WORKSPACE_DEV_SCRIPT_SRC_KEYWORDS,
    frameAncestorsDirective: `frame-ancestors ${parentOrigins.join(" ")}`,
  };
}

/**
 * Convenience wrapper: takes a CSP directive list (e.g. the array a
 * project's `buildCspHeader` builds before `.join("; ")`) and returns
 * a new list with workspace-mode relaxations applied:
 *
 *   - any `script-src …` directive gains the bridge-script origin
 *     plus the dev-React keywords (`'unsafe-eval' 'wasm-unsafe-eval'`)
 *   - any `frame-ancestors …` directive is replaced with the
 *     workspace-parent allowlist
 *
 * Directives that don't match are passed through unchanged. Order is
 * preserved. No-op when not in workspace mode.
 *
 * The function inspects each directive by its first token (the
 * directive name) so per-project nonce + 'strict-dynamic' values
 * round-trip without us understanding their content.
 */
export function buildWorkspaceCsp(
  directives: readonly string[],
): string[] {
  const extensions = buildWorkspaceCspExtensions();
  if (!extensions) return [...directives];
  const out: string[] = [];
  for (const directive of directives) {
    const trimmed = directive.trim();
    const firstSpace = trimmed.indexOf(" ");
    const name = (firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace)).toLowerCase();
    if (name === "script-src") {
      const append = [
        ...extensions.scriptSrcKeywords,
        ...extensions.scriptSrcOrigins,
      ].join(" ");
      out.push(`${trimmed} ${append}`);
    } else if (name === "frame-ancestors") {
      out.push(extensions.frameAncestorsDirective);
    } else {
      out.push(trimmed);
    }
  }
  return out;
}
