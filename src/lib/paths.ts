import path from "node:path";

/** Static assets (fonts, bezels). The CLI points this at the repo when run from another cwd. */
export const PUBLIC_DIR =
  process.env.SCREENY_PUBLIC_DIR ?? path.join(process.cwd(), "public");
