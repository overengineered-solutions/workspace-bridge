import { isWorkspaceSandbox } from "./env.js";

export type SecurityHeader = { key: string; value: string };

/**
 * Filter a project's static security-headers list to drop entries
 * that conflict with iframe embedding when running inside an OES
 * workspace sandbox. Today the only entry that needs removing is
 * `X-Frame-Options` (DENY / SAMEORIGIN both block embedding); CSP's
 * `frame-ancestors` directive (added via `buildWorkspaceCsp` in
 * src/lib/.../csp.ts) supersedes the legacy header anyway.
 *
 * Returns the list unchanged when not in workspace mode. Returns a
 * NEW array (never mutates input).
 *
 * Usage in next.config.ts:
 *
 *   import { workspaceSecurityHeaders } from '@overengineered-solutions/workspace-bridge'
 *   const headers = workspaceSecurityHeaders([
 *     { key: 'X-Frame-Options', value: 'DENY' },
 *     { key: 'X-Content-Type-Options', value: 'nosniff' },
 *     { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
 *   ])
 */
export function workspaceSecurityHeaders(
  baseHeaders: readonly SecurityHeader[],
): SecurityHeader[] {
  if (!isWorkspaceSandbox()) return [...baseHeaders];
  return baseHeaders.filter((h) => h.key.toLowerCase() !== "x-frame-options");
}
