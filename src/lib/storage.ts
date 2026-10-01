import "server-only";
import { put, del } from "@vercel/blob";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export async function storeFile(opts: {
  dir: string;
  name: string;
  data: Buffer;
  contentType: string;
}) {
  const safe = opts.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${opts.dir}/${randomBytes(6).toString("hex")}-${safe}`;
  if (blobEnabled()) {
    const blob = await put(key, opts.data, {
      access: "public",
      contentType: opts.contentType,
      addRandomSuffix: false,
    });
    return blob.url;
  }
  const abs = path.join(process.cwd(), "public", "uploads", key);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, opts.data);
  // Relative URL: works in the browser regardless of host/port; render.ts reads it from disk.
  return `/uploads/${key}`;
}

export async function deleteFile(url: string) {
  try {
    if (blobEnabled()) return await del(url);
    const idx = url.indexOf("/uploads/");
    if (idx >= 0)
      await unlink(path.join(process.cwd(), "public", url.slice(idx + 1)));
  } catch {
    /* ignore */
  }
}

/** Fetch bytes for a URL, reading local uploads from disk when possible. */
export async function readFileBytes(url: string): Promise<Buffer> {
  const idx = url.indexOf("/uploads/");
  if (!blobEnabled() && idx >= 0) {
    const { readFile } = await import("node:fs/promises");
    return readFile(path.join(process.cwd(), "public", url.slice(idx + 1)));
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
