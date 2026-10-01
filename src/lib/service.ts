import "server-only";
import { and, asc, eq, inArray, desc } from "drizzle-orm";
import {
  db,
  projects,
  assets,
  screens,
  type Project,
  type Screen,
  type Asset,
} from "@/lib/db";
import { DEVICES, getDevice, type DeviceId } from "@/lib/devices";
import {
  buildScene,
  type TemplateId,
  type TemplateParams,
} from "@/lib/templates";
import { parseScene, type Scene } from "@/lib/scene";
import { renderSceneToPng } from "@/lib/render";
import { storeFile, deleteFile } from "@/lib/storage";
import { zipSync } from "fflate";

export class NotFound extends Error {
  status = 404;
}
export class BadRequest extends Error {
  status = 400;
}

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ı/g, "i")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "app"
  );
}

// ---- projects ----

export async function listProjects(userId: string) {
  return db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt));
}

export async function getProject(
  userId: string,
  idOrSlug: string,
): Promise<Project> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(idOrSlug);
  const [row] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        isUuid ? eq(projects.id, idOrSlug) : eq(projects.slug, idOrSlug),
      ),
    )
    .limit(1);
  if (!row) throw new NotFound(`Project not found: ${idOrSlug}`);
  return row;
}

export async function createProject(userId: string, name: string) {
  let slug = slugify(name);
  const existing = await db
    .select({ slug: projects.slug })
    .from(projects)
    .where(eq(projects.userId, userId));
  const taken = new Set(existing.map((e) => e.slug));
  let i = 2;
  while (taken.has(slug)) slug = `${slugify(name)}-${i++}`;
  const [row] = await db
    .insert(projects)
    .values({ userId, name, slug })
    .returning();
  return row;
}

export async function renameProject(userId: string, id: string, name: string) {
  await getProject(userId, id);
  const [row] = await db
    .update(projects)
    .set({ name, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  return row;
}

export async function deleteProject(userId: string, id: string) {
  const p = await getProject(userId, id);
  const rows = await db.select().from(assets).where(eq(assets.projectId, p.id));
  await Promise.all(rows.map((a) => deleteFile(a.url)));
  await db.delete(projects).where(eq(projects.id, p.id));
}

async function touch(projectId: string) {
  await db
    .update(projects)
    .set({ updatedAt: new Date() })
    .where(eq(projects.id, projectId));
}

// ---- assets ----

export async function listAssets(userId: string, projectId: string) {
  const p = await getProject(userId, projectId);
  return db
    .select()
    .from(assets)
    .where(eq(assets.projectId, p.id))
    .orderBy(desc(assets.createdAt));
}

export async function addAsset(
  userId: string,
  projectId: string,
  file: {
    name: string;
    data: Buffer;
    contentType: string;
    kind: "screenshot" | "logo" | "image";
  },
): Promise<Asset> {
  const p = await getProject(userId, projectId);
  const { width, height } = await imageSize(file.data);
  const url = await storeFile({
    dir: `p/${p.id}`,
    name: file.name,
    data: file.data,
    contentType: file.contentType,
  });
  const [row] = await db
    .insert(assets)
    .values({
      projectId: p.id,
      kind: file.kind,
      name: file.name,
      url,
      width,
      height,
    })
    .returning();
  await touch(p.id);
  return row;
}

export async function deleteAsset(
  userId: string,
  projectId: string,
  assetId: string,
) {
  const p = await getProject(userId, projectId);
  const [a] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.projectId, p.id)));
  if (!a) throw new NotFound("Asset not found");
  await deleteFile(a.url);
  await db.delete(assets).where(eq(assets.id, a.id));
}

async function imageSize(
  buf: Buffer,
): Promise<{ width: number; height: number }> {
  // PNG
  if (buf[0] === 0x89 && buf.subarray(1, 4).toString() === "PNG") {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // JPEG: walk SOF markers
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let off = 2;
    while (off < buf.length) {
      if (buf[off] !== 0xff) break;
      const marker = buf[off + 1];
      const len = buf.readUInt16BE(off + 2);
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        return {
          height: buf.readUInt16BE(off + 5),
          width: buf.readUInt16BE(off + 7),
        };
      }
      off += 2 + len;
    }
  }
  // WebP VP8X / VP8 / VP8L: keep it simple
  if (
    buf.subarray(0, 4).toString() === "RIFF" &&
    buf.subarray(8, 12).toString() === "WEBP"
  ) {
    const chunk = buf.subarray(12, 16).toString();
    if (chunk === "VP8X")
      return {
        width: 1 + buf.readUIntLE(24, 3),
        height: 1 + buf.readUIntLE(27, 3),
      };
    if (chunk === "VP8 ")
      return {
        width: buf.readUInt16LE(26) & 0x3fff,
        height: buf.readUInt16LE(28) & 0x3fff,
      };
    if (chunk === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
  }
  return { width: 0, height: 0 };
}

// ---- screens ----

export async function listScreens(
  userId: string,
  projectId: string,
  filter?: { locale?: string; device?: string },
) {
  const p = await getProject(userId, projectId);
  const conds = [eq(screens.projectId, p.id)];
  if (filter?.locale) conds.push(eq(screens.locale, filter.locale));
  if (filter?.device) conds.push(eq(screens.device, filter.device));
  return db
    .select()
    .from(screens)
    .where(and(...conds))
    .orderBy(asc(screens.locale), asc(screens.device), asc(screens.position));
}

export async function getScreen(
  userId: string,
  screenId: string,
): Promise<Screen> {
  const [row] = await db
    .select({ s: screens })
    .from(screens)
    .innerJoin(projects, eq(projects.id, screens.projectId))
    .where(and(eq(screens.id, screenId), eq(projects.userId, userId)))
    .limit(1);
  if (!row) throw new NotFound("Screen not found");
  return row.s;
}

export type ScreenSpec = {
  template: TemplateId;
  title?: string;
  subtitle?: string;
  /** Asset id or absolute URL of the in-app screenshot. */
  screenshot?: string | null;
};

export type GenerateInput = {
  locale: string;
  device: DeviceId;
  /** Asset id or URL for the logo on every screen. */
  logo?: string | null;
  background?: Scene["background"];
  textColor?: string;
  /** Replace existing screens for this locale+device. */
  replace?: boolean;
  screens: ScreenSpec[];
};

async function resolveAssetRef(
  projectId: string,
  ref: string | null | undefined,
): Promise<string | null> {
  if (!ref) return null;
  if (/^https?:\/\//.test(ref) || ref.startsWith("data:")) return ref;
  const [a] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.projectId, projectId), eq(assets.id, ref)))
    .limit(1);
  if (a) return a.url;
  const [byName] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.projectId, projectId), eq(assets.name, ref)))
    .limit(1);
  if (byName) return byName.url;
  throw new BadRequest(`Unknown asset: ${ref}`);
}

export async function generateScreens(
  userId: string,
  projectId: string,
  input: GenerateInput,
): Promise<Screen[]> {
  const p = await getProject(userId, projectId);
  const device = getDevice(input.device);
  const logo = await resolveAssetRef(p.id, input.logo);
  if (input.replace) {
    await db
      .delete(screens)
      .where(
        and(
          eq(screens.projectId, p.id),
          eq(screens.locale, input.locale),
          eq(screens.device, input.device),
        ),
      );
  }
  const existing = await db
    .select({ position: screens.position })
    .from(screens)
    .where(
      and(
        eq(screens.projectId, p.id),
        eq(screens.locale, input.locale),
        eq(screens.device, input.device),
      ),
    );
  let position = existing.reduce((m, r) => Math.max(m, r.position + 1), 0);

  const rows = [];
  for (const spec of input.screens) {
    const screenshot = await resolveAssetRef(p.id, spec.screenshot);
    const params: TemplateParams = {
      title: spec.title,
      subtitle: spec.subtitle,
      screenshot,
      logo,
      background: input.background,
      textColor: input.textColor,
    };
    rows.push({
      projectId: p.id,
      locale: input.locale,
      device: input.device,
      position: position++,
      scene: buildScene(device, spec.template, params),
    });
  }
  const inserted = rows.length
    ? await db.insert(screens).values(rows).returning()
    : [];
  await touch(p.id);
  return inserted;
}

export async function createBlankScreen(
  userId: string,
  projectId: string,
  locale: string,
  deviceId: DeviceId,
  template: TemplateId = "hero",
) {
  return (
    await generateScreens(userId, projectId, {
      locale,
      device: deviceId,
      screens: [{ template, title: "Headline", subtitle: "" }],
    })
  )[0];
}

export async function updateScreen(
  userId: string,
  screenId: string,
  patch: { scene?: unknown; position?: number; locale?: string },
) {
  const s = await getScreen(userId, screenId);
  const values: Partial<Screen> = { updatedAt: new Date() };
  if (patch.scene !== undefined) values.scene = parseScene(patch.scene);
  if (patch.position !== undefined) values.position = patch.position;
  if (patch.locale !== undefined) values.locale = patch.locale;
  const [row] = await db
    .update(screens)
    .set(values)
    .where(eq(screens.id, s.id))
    .returning();
  await touch(s.projectId);
  return row;
}

export async function deleteScreen(userId: string, screenId: string) {
  const s = await getScreen(userId, screenId);
  await db.delete(screens).where(eq(screens.id, s.id));
  await touch(s.projectId);
}

export async function duplicateScreen(
  userId: string,
  screenId: string,
  into?: { locale?: string; device?: DeviceId },
) {
  const s = await getScreen(userId, screenId);
  const locale = into?.locale ?? s.locale;
  const deviceId = into?.device ?? (s.device as DeviceId);
  let scene = s.scene;
  if (deviceId !== s.device) scene = rescaleScene(s.scene, getDevice(deviceId));
  const [row] = await db
    .insert(screens)
    .values({
      projectId: s.projectId,
      locale,
      device: deviceId,
      position: s.position + 1,
      scene,
    })
    .returning();
  await touch(s.projectId);
  return row;
}

/** Proportionally scale a scene to another device size (by width; height overflow is clipped). */
export function rescaleScene(
  scene: Scene,
  device: { width: number; height: number },
): Scene {
  const k = device.width / scene.width;
  return {
    ...scene,
    width: device.width,
    height: device.height,
    layers: scene.layers.map((l) => {
      const base = {
        ...l,
        x: Math.round(l.x * k),
        y: Math.round(l.y * k),
        w: Math.round(l.w * k),
        h: Math.round(l.h * k),
      };
      if (base.type === "text")
        return {
          ...base,
          fontSize: Math.round(base.fontSize * k),
          letterSpacing: Math.round(base.letterSpacing * k),
        };
      return base;
    }),
  };
}

export async function reorderScreens(
  userId: string,
  projectId: string,
  orderedIds: string[],
) {
  await getProject(userId, projectId);
  await Promise.all(
    orderedIds.map((id, i) =>
      db.update(screens).set({ position: i }).where(eq(screens.id, id)),
    ),
  );
}

// ---- export ----

export async function renderScreen(
  userId: string,
  screenId: string,
): Promise<Buffer> {
  const s = await getScreen(userId, screenId);
  return renderSceneToPng(s.scene);
}

export function exportFileName(s: Screen) {
  const d = DEVICES[s.device as DeviceId];
  return `${s.locale}/${d?.store ?? "store"}-${s.device}-${String(s.position + 1).padStart(2, "0")}.png`;
}

export async function exportZip(
  userId: string,
  projectId: string,
  filter?: { locale?: string; device?: string; ids?: string[] },
): Promise<Buffer> {
  let rows = await listScreens(userId, projectId, filter);
  if (filter?.ids?.length) {
    const set = new Set(filter.ids);
    rows = rows.filter((r) => set.has(r.id));
  }
  if (!rows.length) throw new BadRequest("No screens to export");
  const files: Record<string, Uint8Array> = {};
  // Render sequentially: satori + resvg at 1320x2868 is CPU heavy; parallel runs OOM on small lambdas.
  for (const s of rows) {
    files[exportFileName(s)] = new Uint8Array(await renderSceneToPng(s.scene));
  }
  return Buffer.from(zipSync(files, { level: 0 }));
}

export async function screensByIds(userId: string, ids: string[]) {
  if (!ids.length) return [];
  const rows = await db
    .select({ s: screens })
    .from(screens)
    .innerJoin(projects, eq(projects.id, screens.projectId))
    .where(and(inArray(screens.id, ids), eq(projects.userId, userId)));
  return rows.map((r) => r.s);
}
