import * as React from "react";
import {
  WORKSPACE_BRIDGE_VERSION,
  resolveBridgeScriptUrl,
} from "./constants.js";
import { isWorkspaceSandbox } from "./env.js";

export type WorkspaceBridgeProps = {
  /**
   * Override the bridge script URL. Defaults to the production OES
   * deployment's `/oes-ide-bridge.js`. Set this to point at a
   * staging / preview / locally-served bridge during development.
   */
  scriptSrc?: string;
  /**
   * CSP nonce to attach to the rendered `<script>` tag. REQUIRED if
   * your consumer's CSP uses `'strict-dynamic'` — browsers ignore
   * explicit script-src origins when `'strict-dynamic'` is present, so
   * the only path for the bridge script to load is a nonce match. Read
   * the nonce from your middleware's request header (e.g. `x-nonce`)
   * via Next.js's `headers()` and pass it down here.
   *
   * Example (Next.js App Router):
   *
   *   import { headers } from 'next/headers'
   *   const nonce = (await headers()).get('x-nonce') ?? undefined
   *   return <WorkspaceBridge nonce={nonce} />
   */
  nonce?: string;
};

/**
 * Server-rendered `<script defer src=…>` tag that loads the OES
 * iframe-observability bridge. The bridge is OPT-IN per-project; this
 * component is the canonical way to opt in.
 *
 * Always emits a `<meta name="oes-workspace-bridge">` tag so operators
 * can `curl <previewUrl> | grep oes-workspace-bridge` to verify the
 * gate's verdict. The `<script>` tag is gated on `IDE_SESSION_ID`
 * — outside workspace mode, the script tag never renders and the meta
 * reports `inactive`.
 *
 *   import { WorkspaceBridge } from '@overengineered-solutions/workspace-bridge'
 *
 *   export default function RootLayout({ children }) {
 *     return (
 *       <html><body>
 *         {children}
 *         <WorkspaceBridge />
 *       </body></html>
 *     )
 *   }
 *
 * The script itself no-ops when not framed (per `oes-ide-bridge.js`
 * which checks `window.parent === window` before doing anything), so
 * even if a non-workspace caller manages to render the tag, no
 * postMessages fly.
 *
 * For your CSP to allow the script to load, also use
 * `buildWorkspaceCsp` to extend script-src — otherwise the browser
 * blocks the script-src and the bridge never attaches.
 */
export function WorkspaceBridge(
  props: WorkspaceBridgeProps = {},
): React.JSX.Element {
  const active = isWorkspaceSandbox();
  const src = props.scriptSrc ?? resolveBridgeScriptUrl();
  return (
    <>
      <meta
        name="oes-workspace-bridge"
        content={active ? "active" : "inactive"}
        data-session-set={String(active)}
        data-bridge-version={WORKSPACE_BRIDGE_VERSION}
      />
      {active ? <script defer src={src} nonce={props.nonce} /> : null}
    </>
  );
}
