// Pure-ESM test using Node's built-in test runner (node:test).
// Imports the compiled ESM output from ../../dist/esm so we exercise
// what consumers actually receive from the npm tarball.
//
// Run via `pnpm test` (which builds first, then `node --test`).
import { describe, it, beforeEach, afterEach } from "node:test";
import { strict as assert } from "node:assert";

import {
  buildWorkspaceCsp,
  buildWorkspaceCspExtensions,
} from "../../dist/esm/csp.js";

const SESSION_ENV = "IDE_SESSION_ID";

function withSession(value, fn) {
  const prior = process.env[SESSION_ENV];
  if (value === null) delete process.env[SESSION_ENV];
  else process.env[SESSION_ENV] = value;
  try {
    fn();
  } finally {
    if (prior === undefined) delete process.env[SESSION_ENV];
    else process.env[SESSION_ENV] = prior;
  }
}

describe("buildWorkspaceCsp", () => {
  beforeEach(() => {
    delete process.env[SESSION_ENV];
    delete process.env.OES_BRIDGE_SCRIPT_URL;
    delete process.env.OES_WORKSPACE_PARENT_ORIGINS;
  });
  afterEach(() => {
    delete process.env[SESSION_ENV];
    delete process.env.OES_BRIDGE_SCRIPT_URL;
    delete process.env.OES_WORKSPACE_PARENT_ORIGINS;
  });

  it("returns directives unchanged outside workspace mode", () => {
    withSession(null, () => {
      const input = [
        "default-src 'self'",
        "script-src 'self' 'nonce-abc' https://js.stripe.com",
        "frame-ancestors 'none'",
        "style-src 'self'",
      ];
      const out = buildWorkspaceCsp(input);
      assert.deepEqual(out, input);
      assert.equal(buildWorkspaceCspExtensions(), null);
    });
  });

  it("appends unsafe-eval + wasm-unsafe-eval + bridge origin to script-src in workspace mode", () => {
    withSession("sess-123", () => {
      const ext = buildWorkspaceCspExtensions();
      assert.ok(ext, "extensions should be non-null in workspace mode");
      assert.deepEqual(ext.scriptSrcKeywords, [
        "'unsafe-eval'",
        "'wasm-unsafe-eval'",
      ]);

      const out = buildWorkspaceCsp([
        "default-src 'self'",
        "script-src 'self' 'nonce-abc' https://js.stripe.com",
        "frame-ancestors 'none'",
        "style-src 'self'",
      ]);

      const scriptSrc = out.find((d) => d.startsWith("script-src"));
      assert.ok(scriptSrc, "script-src directive must be present");
      assert.match(scriptSrc, /'unsafe-eval'/);
      assert.match(scriptSrc, /'wasm-unsafe-eval'/);
      assert.match(scriptSrc, /https?:\/\//, "bridge origin must be appended");

      const frameAncestors = out.find((d) => d.startsWith("frame-ancestors"));
      assert.ok(frameAncestors, "frame-ancestors must be replaced");
      assert.notEqual(frameAncestors, "frame-ancestors 'none'");

      // Untouched directives round-trip
      assert.ok(out.includes("default-src 'self'"));
      assert.ok(out.includes("style-src 'self'"));
    });
  });

  it("preserves nonce + strict-dynamic in script-src round-trip", () => {
    withSession("sess-xyz", () => {
      const out = buildWorkspaceCsp([
        "script-src 'self' 'nonce-deadbeef' 'strict-dynamic' https://js.stripe.com",
      ]);
      const scriptSrc = out[0];
      assert.match(scriptSrc, /'nonce-deadbeef'/);
      assert.match(scriptSrc, /'strict-dynamic'/);
      assert.match(scriptSrc, /'unsafe-eval'/);
    });
  });

  it("frame-ancestors uses env-overridden allowlist when set", () => {
    withSession("sess-456", () => {
      process.env.OES_WORKSPACE_PARENT_ORIGINS =
        "https://example-tenant.com,https://app.overengineeredsolutions.org";
      const out = buildWorkspaceCsp(["frame-ancestors 'none'"]);
      assert.equal(
        out[0],
        "frame-ancestors https://example-tenant.com https://app.overengineeredsolutions.org",
      );
    });
  });
});
