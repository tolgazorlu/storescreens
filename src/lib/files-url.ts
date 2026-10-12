// Shared by the scene schema (client + server) and the server-side storage; no node imports here.

const LOOPBACK = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\]|::1)$/i;

/**
 * Maps a scene image src to its "/files/..." form. Accepts "/files/x" and absolute URLs that
 * point at this server's own files (MCP results carry those). Anything else returns null:
 * the renderer must never fetch an arbitrary URL on behalf of a scene.
 */
export function localFilesPath(url: string): string | null {
  if (url.startsWith("/files/")) return url;
  try {
    const u = new URL(url);
    if ((u.protocol === "http:" || u.protocol === "https:") && LOOPBACK.test(u.hostname) && u.pathname.startsWith("/files/")) {
      return decodeURIComponent(u.pathname);
    }
  } catch {
    /* not a URL */
  }
  return null;
}
