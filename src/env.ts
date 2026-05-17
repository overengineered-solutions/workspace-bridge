/**
 * Runtime detector: is this process running inside an OES IDE
 * workspace sandbox?
 *
 * Source of truth: the `IDE_SESSION_ID` env var, which OES's
 * `buildIdeSandboxEnv` (oesolutions/src/lib/ide/sandbox.ts) sets
 * at sandbox-bind time. Prod / preview / staging Vercel deployments
 * never see it.
 *
 * Read fresh on every call so a server-rendered page in the OES
 * workspace sandbox always reflects current process state (the env
 * is set at process start and doesn't change mid-run, but reading
 * on demand keeps the helper composable + makes future env changes
 * safe).
 */
export function isWorkspaceSandbox(): boolean {
  const value = process.env.IDE_SESSION_ID;
  return typeof value === "string" && value.length > 0;
}
