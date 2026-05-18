# @overengineered-solutions/workspace-bridge

Shared workspace-IDE integration for OES portfolio projects. Drop into any sibling app (primopicks, makeros, future projects scaffolded from `oes-project-template`) and the project's `pnpm dev` preview becomes iframe-embeddable inside OES's workspace IDE, with bridge-event observability flowing to the chat agent.

All behavior is gated on the `IDE_SESSION_ID` env var, which OES's `buildIdeSandboxEnv` sets at sandbox-bind time. Production / preview / staging Vercel deployments never see it, so the package is a strict no-op outside the workspace context.

## Install

```bash
pnpm add @overengineered-solutions/workspace-bridge
```

## Use (Next.js App Router)

### `next.config.ts`

```ts
import { workspaceSecurityHeaders } from "@overengineered-solutions/workspace-bridge";

const securityHeaders = workspaceSecurityHeaders([
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // …
]);
```

In workspace mode, `X-Frame-Options` is filtered out so CSP's `frame-ancestors` (set below) is the only iframe gate.

### CSP construction (e.g. `src/lib/shared/csp.ts`)

```ts
import { buildWorkspaceCsp } from "@overengineered-solutions/workspace-bridge";

export function buildCspHeader(nonce: string): string {
  const directives = buildWorkspaceCsp([
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com`,
    "frame-ancestors 'none'",
    // …
  ]);
  return directives.join("; ");
}
```

In workspace mode, `buildWorkspaceCsp` augments `script-src` with the bridge-script origin **plus** the dev-React keywords (`'unsafe-eval' 'wasm-unsafe-eval'`, see below), and replaces `frame-ancestors 'none'` with the OES workspace-parent allowlist (`*.vercel.app` + `overengineeredsolutions.org`).

### Why the `'unsafe-eval'` relaxation in workspace mode

OES workspace sandboxes run the consuming app's `pnpm dev` server (per CLAUDE.md workspace-tier guidance). React DevTools, HMR, Turbopack's WASM loader, and Next.js's source-maps panel all evaluate code at runtime — without `'unsafe-eval'` + `'wasm-unsafe-eval'` in `script-src`, dev React refuses to start and the iframe shows a *"CSP header missing 'unsafe-eval'"* error.

The package adds these keywords **only** when `isWorkspaceSandbox()` returns true (i.e. `IDE_SESSION_ID` is set on the sandbox process by OES's `buildIdeSandboxEnv`). Production, preview, and staging Vercel deploys do not set that env var, so their CSP stays HITRUST-locked.

The sandbox itself is single-tenant, ephemeral (torn down between sessions), and network-egress-restricted at the Vercel Sandbox layer to a workspace allow-list — runtime-evaluated JS cannot reach beyond the allow-list, so the relaxation does not widen the data-exfiltration surface.

### `src/app/layout.tsx`

```tsx
import { WorkspaceBridge } from "@overengineered-solutions/workspace-bridge";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <WorkspaceBridge />
      </body>
    </html>
  );
}
```

`<WorkspaceBridge />` always renders a `<meta name="oes-workspace-bridge" content="active|inactive" data-session-set="true|false" data-bridge-version="X.Y.Z">` tag so an operator can `curl <previewUrl> | grep oes-workspace-bridge` to verify the gate's verdict. The `<script>` tag is only emitted in workspace mode.

## API

| Export | Purpose |
| --- | --- |
| `isWorkspaceSandbox()` | Returns `true` when `process.env.IDE_SESSION_ID` is set. Use to gate other workspace-only behavior. |
| `<WorkspaceBridge />` | Server component that renders the bridge `<script defer src=…>` tag in workspace mode. Accepts optional `scriptSrc` to override the default OES URL. |
| `buildWorkspaceCsp(directives)` | Returns a new CSP directive array with `script-src` extended and `frame-ancestors` replaced in workspace mode. No-op otherwise. |
| `buildWorkspaceCspExtensions()` | Lower-level: returns `{ scriptSrcOrigins, frameAncestorsDirective }` for callers that want manual control. |
| `workspaceSecurityHeaders(headers)` | Filters `X-Frame-Options` out of a static security-header list in workspace mode. |
| `DEFAULT_BRIDGE_SCRIPT_URL` | The default OES-served bridge script URL. |
| `WORKSPACE_BRIDGE_VERSION` | String constant matching `package.json` `version`. Surfaced in the meta tag for version-drift detection across deployed iframes. |

## Doctrine

- **Never weakens production security.** All relaxations conditional on a server-set env var that only the OES workspace platform sets.
- **Pure functions.** CSP + headers helpers return new arrays; no mutation, no globals.
- **Single env signal.** `IDE_SESSION_ID` is the canonical workspace marker, set by `oesolutions/src/lib/ide/sandbox.ts` at bind time.

## Privacy / HITRUST contract

The bridge script (`oes-ide-bridge.js`) forwards:

- `console.{log,info,warn,error,debug}` arguments (stringified through a depth-3, args-cap-8, string-cap-2000 redactor)
- `window.onerror` payloads (`message`, `filename`, `lineno`, `colno`, `stack`)
- `unhandledrejection` reasons (stringified through the same redactor)
- `click` events (`tagName` / `id` / first 3 classes / first 60 chars of innerText, walking up 4 levels)
- `navigation` performance summary (`domContentLoaded`, `loadEvent`, `location.href`) — fires once per page load

The bridge script **never** forwards: form values, cookies, `localStorage` / `sessionStorage`, URL query strings (except as part of `location.href` on the one-shot navigation event), or response bodies.

On the OES side, `recordBridgeEventAction` re-validates and truncates payloads before insert into `audit_events.kind = 'ide_bridge_event'`. Both layers enforce the contract.

## Diagnostic flow (when bridge says "not attached")

1. `curl -s <previewUrl> | grep oes-workspace-bridge`
   - `content="active"` — env-gate passed; the script tag is being emitted. The failure is downstream (CSP block, script load failure, or postMessage never arriving). Open the BridgePanel debug accordion to see what postMessages the parent IS receiving.
   - `content="inactive"` — env-gate failed; `process.env.IDE_SESSION_ID` is unset in the dev server's process. Check the sandbox's `.env.local` file: `cat /vercel/sandbox/.env.local`. OES seeds this file at bind time (`seedDevEnvFile` in `oesolutions/src/lib/ide/workspace.ts`).
   - Meta tag absent — the component isn't rendering at all. Verify the consumer's `pnpm-lock.yaml` resolves to a version of this package that includes the meta tag (≥ 0.1.2).
2. If `audit_events` has no `ide_bridge_event` rows for the session, the script never executed (or postMessage didn't reach the parent's listener).
