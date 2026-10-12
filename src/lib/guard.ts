// Pure request check shared by src/proxy.ts and its tests; no node or next imports.

const LOOPBACK = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?$/i;

/**
 * Screeny has no auth, so the API and MCP routes must only be reachable from this machine:
 * the Host header has to be loopback (a DNS-rebinding page cannot satisfy that) and a browser
 * Origin, when sent, has to be the app itself (another site cannot post uploads or MCP calls).
 * Requests without an Origin (curl, MCP clients) pass: they already run on this machine.
 */
export function rejectUnlessLocal(headers: { get(name: string): string | null }): string | null {
  const host = headers.get("host") ?? "";
  if (!LOOPBACK.test(host)) return "screeny only answers on localhost";
  const origin = headers.get("origin");
  if (origin) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      /* malformed origin */
    }
    if (originHost !== host) return "cross-origin request refused";
  }
  return null;
}
