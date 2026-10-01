import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export const DATA_DIR =
  process.env.SCREENY_DATA_DIR ?? path.join(process.cwd(), "data");
mkdirSync(DATA_DIR, { recursive: true });

const client = createClient({
  url: `file:${path.join(DATA_DIR, "screeny.db")}`,
});

/** Schema is tiny and append-only; create it on boot so there is no migrate step. */
const BOOTSTRAP = [
  "PRAGMA foreign_keys = ON",
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    kind TEXT NOT NULL, name TEXT NOT NULL, url TEXT NOT NULL,
    width INTEGER NOT NULL, height INTEGER NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS screens (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    locale TEXT NOT NULL, device TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0,
    scene TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
];
const ready = (async () => {
  for (const sql of BOOTSTRAP) await client.execute(sql);
})();

export const db = drizzle(client, { schema });
export const dbReady = ready;
export * from "./schema";
