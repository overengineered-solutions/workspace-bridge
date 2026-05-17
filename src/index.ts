/**
 * @overengineered-solutions/workspace-bridge
 *
 * Shared workspace-IDE integration for OES portfolio projects. Every
 * sibling app (primopicks, makeros, future) that wants its `pnpm dev`
 * preview iframe-embedded in the OES workspace needs three security
 * relaxations + one bridge script. All gated on the `IDE_SESSION_ID`
 * env var, which OES's `buildIdeSandboxEnv` sets at sandbox-bind
 * time and which prod / preview / staging deploys never see.
 *
 * Integration (Next.js App Router project):
 *
 *   // next.config.ts
 *   import { workspaceSecurityHeaders } from '@overengineered-solutions/workspace-bridge'
 *   const securityHeaders = workspaceSecurityHeaders([
 *     { key: 'X-Frame-Options', value: 'DENY' },
 *     { key: 'X-Content-Type-Options', value: 'nosniff' },
 *     // …
 *   ])
 *
 *   // src/lib/csp.ts (or wherever you build CSP)
 *   import { buildWorkspaceCsp } from '@overengineered-solutions/workspace-bridge'
 *   const directives = buildWorkspaceCsp([
 *     "default-src 'self'",
 *     `script-src 'self' 'nonce-${nonce}' …`,
 *     "frame-ancestors 'none'",
 *     // …
 *   ])
 *
 *   // src/app/layout.tsx
 *   import { WorkspaceBridge } from '@overengineered-solutions/workspace-bridge'
 *   export default function RootLayout({ children }) {
 *     return (
 *       <html><body>
 *         {children}
 *         <WorkspaceBridge />
 *       </body></html>
 *     )
 *   }
 *
 * That's it. Workspace sandbox binds set IDE_SESSION_ID; the three
 * helpers fire; OES workspace iframe loads the dev server; bridge
 * script attaches and postMessages console/click/nav/error events
 * back to the parent so the chat agent can read what the operator did.
 *
 * Doctrine: per-deployment-target security stays strict by default
 * (no env var → relaxations no-op). The package never weakens
 * production security; it only opens the gate for a specific
 * server-set env var that only the OES platform produces.
 */

export { isWorkspaceSandbox } from "./env.js";
export {
  buildWorkspaceCsp,
  buildWorkspaceCspExtensions,
  type WorkspaceCspExtensions,
} from "./csp.js";
export {
  workspaceSecurityHeaders,
  type SecurityHeader,
} from "./headers.js";
export { WorkspaceBridge, type WorkspaceBridgeProps } from "./bridge.js";
export {
  DEFAULT_BRIDGE_SCRIPT_URL,
  WORKSPACE_BRIDGE_VERSION,
} from "./constants.js";
