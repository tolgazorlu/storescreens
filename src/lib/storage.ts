import "server-only";
import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { DATA_DIR } from "@/lib/db";

/** Files live under data/files and are served by /files/[...path]. */
export const FILES_DIR = path.join(DATA_DIR, "files");

export async function storeFile(opts: {
  dir: string;
  name: string;
  data: Buffer;
  contentType: string;
}) {
  const safe = opts.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${opts.dir}/${randomBytes(6).toString("hex")}-${safe}`;
  const abs = path.join(FILES_DIR, key);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, opts.data);
  return `/files/${key}`;
}

export async function deleteFile(url: string) {
  try {
    await unlink(absPath(url));
  } catch {
    /* already gone */
  }
}

export async function readFileBytes(url: string): Promise<Buffer> {
  if (url.startsWith("/files/")) return readFile(absPath(url));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export function absPath(url: string) {
  const rel = url.replace(/^\/files\//, "");
  const abs = path.join(FILES_DIR, rel);
  if (!abs.startsWith(FILES_DIR)) throw new Error("Bad path");
  return abs;
}
