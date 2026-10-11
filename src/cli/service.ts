import { fileURLToPath } from "node:url";

/**
 * Loads the service layer. PUBLIC_DIR is read once at module init, so the
 * env var must be set before the dynamic import. The bundle lives in
 * <repo>/dist-cli, so the repo's public dir is one level up.
 */
export async function loadService() {
  process.env.SCREENY_PUBLIC_DIR ??= fileURLToPath(
    new URL("../public", import.meta.url),
  );
  return import("@/lib/service");
}
