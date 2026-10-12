import "server-only";
import { and, asc, eq, inArray, desc, sql } from "drizzle-orm";
import {
  db,
  dbReady,
  projects,
  assets,
  screens,
  copy,
  type Project,
  type Screen,
  type Asset,
} from "@/lib/db";
import { randomUUID } from "node:crypto";
import { DEVICES, getDevice, type DeviceId } from "@/lib/devices";
import {
  buildScene,
  type TemplateId,
  type TemplateParams,
} from "@/lib/templates";
import {
  parseScene,
  type Scene,
  type TextLayer,
  type MockupLayer,
} from "@/lib/scene";
import { brandSchema, DEFAULT_BRAND, type Brand } from "@/lib/brand";
import { renderSceneToPng } from "@/lib/render";
import { storeFile, deleteFile } from "@/lib/storage";
import { imageSize } from "@/lib/image-size";
import { zipSync } from "fflate";
import sharp from "sharp";

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

export async function listProjects() {
  await dbReady;
  return db.select().from(projects).orderBy(desc(projects.updatedAt));
}

/** Project rows plus what the project list shows: counts, locales and a cover scene. */
export async function listProjectSummaries() {
  const rows = await listProjects();
  const stats = await db
    .select({
      projectId: screens.projectId,
      count: sql<number>`count(*)`,
      locales: sql<string>`group_concat(distinct ${screens.locale})`,
    })
    .from(screens)
    .groupBy(screens.projectId);
  const byId = new Map(stats.map((s) => [s.projectId, s]));
  return Promise.all(
    rows.map(async (p) => {
      // Cover: the English main iPhone set first, creative canvases last.
      const [cover] = await db
        .select({ scene: screens.scene })
        .from(screens)
        .where(eq(screens.projectId, p.id))
        .orderBy(
          sql`case when ${screens.device} = 'iphone-6.9' then 0 when ${screens.device} like 'appstore-%' then 2 else 1 end`,
          sql`case when ${screens.locale} = 'en' then 0 else 1 end`,
          asc(screens.locale),
          asc(screens.position),
        )
        .limit(1);
      const st = byId.get(p.id);
      return {
        project: p,
        screenCount: Number(st?.count ?? 0),
        locales: st?.locales ? st.locales.split(",").sort() : [],
        cover: cover?.scene ?? null,
      };
    }),
  );
}

export async function getProject(idOrSlug: string): Promise<Project> {
  await dbReady;
  const isUuid = /^[0-9a-f-]{36}$/i.test(idOrSlug);
  const [row] = await db
    .select()
    .from(projects)
    .where(isUuid ? eq(projects.id, idOrSlug) : eq(projects.slug, idOrSlug))
    .limit(1);
  if (!row) throw new NotFound(`Project not found: ${idOrSlug}`);
  return row;
}

export async function createProject(name: string) {
  await dbReady;
  let slug = slugify(name);
  const taken = new Set(
    (await db.select({ slug: projects.slug }).from(projects)).map(
      (e) => e.slug,
    ),
  );
  let i = 2;
  while (taken.has(slug)) slug = `${slugify(name)}-${i++}`;
  const [row] = await db.insert(projects).values({ name, slug }).returning();
  return row;
}

export async function renameProject(id: string, name: string) {
  await getProject(id);
  const [row] = await db
    .update(projects)
    .set({ name, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  return row;
}

export async function deleteProject(id: string) {
  const p = await getProject(id);
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

export async function listAssets(projectId: string) {
  const p = await getProject(projectId);
  return db
    .select()
    .from(assets)
    .where(eq(assets.projectId, p.id))
    .orderBy(desc(assets.createdAt));
}

export async function addAsset(
  projectId: string,
  file: {
    name: string;
    data: Buffer;
    contentType: string;
    kind: "screenshot" | "logo" | "image";
  },
): Promise<Asset> {
  const p = await getProject(projectId);
  const { width, height } = imageSize(file.data);
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

export async function deleteAsset(projectId: string, assetId: string) {
  const p = await getProject(projectId);
  const [a] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.projectId, p.id)));
  if (!a) throw new NotFound("Asset not found");
  await deleteFile(a.url);
  await db.delete(assets).where(eq(assets.id, a.id));
}

// ---- screens ----

export async function listScreens(
  projectId: string,
  filter?: { locale?: string; device?: string },
) {
  const p = await getProject(projectId);
  const conds = [eq(screens.projectId, p.id)];
  if (filter?.locale) conds.push(eq(screens.locale, filter.locale));
  if (filter?.device) conds.push(eq(screens.device, filter.device));
  return db
    .select()
    .from(screens)
    .where(and(...conds))
    .orderBy(asc(screens.locale), asc(screens.device), asc(screens.position));
}

export async function getScreen(screenId: string): Promise<Screen> {
  await dbReady;
  const [row] = await db
    .select()
    .from(screens)
    .where(eq(screens.id, screenId))
    .limit(1);
  if (!row) throw new NotFound("Screen not found");
  return row;
}

/** A string, or a map of locale -> string. */
export type Localized = string | Record<string, string>;

export type ScreenSpec = {
  template: TemplateId;
  title?: Localized;
  subtitle?: Localized;
  /** Asset id, asset name or absolute URL of the in-app screenshot; or a per-locale map. */
  screenshot?: Localized | null;
  screenshot2?: Localized | null;
  screenshot3?: Localized | null;
  bullets?: { icon?: string; text: Localized }[];
  titleScale?: number;
  phoneScale?: number;
  phoneOffsetY?: number;
};

export type GenerateInput = {
  /** One locale, or several at once (each gets its own screens, linked by groupId). */
  locale?: string;
  locales?: string[];
  device: DeviceId;
  logo?: string | null;
  brand?: Partial<Brand>;
  background?: Scene["background"];
  textColor?: string;
  fontFamily?: string;
  /** Replace existing screens for this locale+device. */
  replace?: boolean;
  screens: ScreenSpec[];
};

export function projectBrand(p: Project): Brand {
  return brandSchema.parse({ ...DEFAULT_BRAND, ...(p.brand ?? {}) });
}

export async function updateBrand(id: string, patch: Partial<Brand>) {
  const p = await getProject(id);
  const brand = brandSchema.parse({ ...projectBrand(p), ...patch });
  const [row] = await db
    .update(projects)
    .set({ brand, updatedAt: new Date() })
    .where(eq(projects.id, p.id))
    .returning();
  return row;
}

function pick(
  v: Localized | null | undefined,
  locale: string,
): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string") return v;
  return v[locale] ?? v[locale.split("-")[0]] ?? v.en ?? Object.values(v)[0];
}

async function resolveAssetRef(
  projectId: string,
  ref: string | null | undefined,
): Promise<string | null> {
  if (!ref) return null;
  if (
    /^https?:\/\//.test(ref) ||
    ref.startsWith("data:") ||
    ref.startsWith("/files/")
  )
    return ref;
  const [a] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.projectId, projectId), eq(assets.id, ref)))
    .limit(1);
  if (a) return a.url;
  // Same name uploaded again: the newest upload wins.
  const [byName] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.projectId, projectId), eq(assets.name, ref)))
    .orderBy(desc(assets.createdAt))
    .limit(1);
  if (byName) return byName.url;
  throw new BadRequest(`Unknown asset: ${ref}`);
}

/** width / height of an uploaded asset, by its URL. */
async function assetAspect(
  projectId: string,
  url: string | null,
): Promise<number | undefined> {
  if (!url) return undefined;
  const [a] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.projectId, projectId), eq(assets.url, url)))
    .limit(1);
  return a?.width && a?.height ? a.width / a.height : undefined;
}

export async function generateScreens(
  projectId: string,
  input: GenerateInput,
): Promise<Screen[]> {
  const p = await getProject(projectId);
  const device = getDevice(input.device);
  const logo = await resolveAssetRef(p.id, input.logo);
  const locales = input.locales?.length
    ? input.locales
    : [input.locale ?? "en"];
  const brand: Partial<Brand> = { ...projectBrand(p), ...(input.brand ?? {}) };
  const groupIds = input.screens.map(() => randomUUID());
  const inserted: Screen[] = [];

  for (const locale of locales) {
    if (input.replace) {
      await db
        .delete(screens)
        .where(
          and(
            eq(screens.projectId, p.id),
            eq(screens.locale, locale),
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
          eq(screens.locale, locale),
          eq(screens.device, input.device),
        ),
      );
    let position = existing.reduce((m, r) => Math.max(m, r.position + 1), 0);

    const rows = [];
    const copyRows: { groupId: string; field: string; value: string }[] = [];
    for (const [i, spec] of input.screens.entries()) {
      const title = pick(spec.title, locale);
      const subtitle = pick(spec.subtitle, locale);
      const bullets = spec.bullets?.map((b) => ({
        icon: b.icon,
        text: pick(b.text, locale) ?? "",
      }));
      const params: TemplateParams = {
        title,
        subtitle,
        screenshot: await resolveAssetRef(p.id, pick(spec.screenshot, locale)),
        screenshot2: await resolveAssetRef(
          p.id,
          pick(spec.screenshot2, locale),
        ),
        screenshot3: await resolveAssetRef(
          p.id,
          pick(spec.screenshot3, locale),
        ),
        logo,
        bullets,
        brand,
        background: input.background,
        textColor: input.textColor,
        fontFamily: input.fontFamily,
        titleScale: spec.titleScale,
        phoneScale: spec.phoneScale,
        phoneOffsetY: spec.phoneOffsetY,
      };
      params.screenshotAspect = await assetAspect(p.id, params.screenshot ?? null);
      rows.push({
        projectId: p.id,
        locale,
        device: input.device,
        position: position++,
        groupId: groupIds[i],
        scene: buildScene(device, spec.template, params),
      });
      if (title)
        copyRows.push({ groupId: groupIds[i], field: "title", value: title });
      if (subtitle)
        copyRows.push({
          groupId: groupIds[i],
          field: "subtitle",
          value: subtitle,
        });
      bullets?.forEach((b, bi) =>
        copyRows.push({
          groupId: groupIds[i],
          field: `bullet${bi + 1}`,
          value: b.text,
        }),
      );
    }
    if (rows.length)
      inserted.push(...(await db.insert(screens).values(rows).returning()));
    for (const c of copyRows)
      await upsertCopy(p.id, c.groupId, locale, c.field, c.value);
  }
  await touch(p.id);
  return inserted;
}

async function upsertCopy(
  projectId: string,
  groupId: string,
  locale: string,
  field: string,
  value: string,
) {
  await db
    .insert(copy)
    .values({ projectId, groupId, locale, field, value })
    .onConflictDoUpdate({
      target: [copy.projectId, copy.groupId, copy.locale, copy.field],
      set: { value, updatedAt: new Date() },
    });
}

// ---- localization ----

/** Copy positions/sizes/styles from one screen to the same group's screens in other locales. Text and screenshots stay. */
export async function propagateLayout(screenId: string, toLocales?: string[]) {
  const src = await getScreen(screenId);
  if (!src.groupId)
    throw new BadRequest(
      "Screen has no group (generated before localization support)",
    );
  const conds = [
    eq(screens.projectId, src.projectId),
    eq(screens.groupId, src.groupId),
    eq(screens.device, src.device),
  ];
  const targets = (
    await db
      .select()
      .from(screens)
      .where(and(...conds))
  ).filter(
    (t) => t.id !== src.id && (!toLocales || toLocales.includes(t.locale)),
  );
  const updated: Screen[] = [];
  for (const t of targets) {
    const byIndex = new Map(src.scene.layers.map((l, i) => [i, l]));
    const layers = t.scene.layers.map((l, i) => {
      const s = byIndex.get(i);
      if (!s || s.type !== l.type) return l;
      if (l.type === "text" && s.type === "text") {
        return { ...s, id: l.id, text: l.text, dir: l.dir };
      }
      if (l.type === "mockup" && s.type === "mockup")
        return { ...s, id: l.id, src: l.src };
      if (l.type === "image" && s.type === "image")
        return { ...s, id: l.id, src: l.src };
      return { ...s, id: l.id };
    });
    const [row] = await db
      .update(screens)
      .set({
        scene: { ...t.scene, background: src.scene.background, layers },
        updatedAt: new Date(),
      })
      .where(eq(screens.id, t.id))
      .returning();
    updated.push(row);
  }
  await touch(src.projectId);
  return updated;
}

/** locale x group x field as CSV rows. Column order: group, position, field, then one column per locale. */
export async function exportCopyCsv(projectId: string): Promise<string> {
  const p = await getProject(projectId);
  const rows = await db.select().from(copy).where(eq(copy.projectId, p.id));
  const screenRows = await db
    .select({ groupId: screens.groupId, position: screens.position })
    .from(screens)
    .where(eq(screens.projectId, p.id));
  const pos = new Map(
    screenRows
      .filter((s) => s.groupId)
      .map((s) => [s.groupId as string, s.position]),
  );
  const locales = [...new Set(rows.map((r) => r.locale))].sort();
  const keys = [
    ...new Set(rows.map((r) => `${r.groupId}\u0000${r.field}`)),
  ].sort((a, b) => {
    const [ga, fa] = a.split("\u0000");
    const [gb, fb] = b.split("\u0000");
    return (pos.get(ga) ?? 0) - (pos.get(gb) ?? 0) || fa.localeCompare(fb);
  });
  const byKey = new Map<string, Record<string, string>>();
  for (const r of rows) {
    const k = `${r.groupId}\u0000${r.field}`;
    byKey.set(k, { ...(byKey.get(k) ?? {}), [r.locale]: r.value });
  }
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [["group", "screen", "field", ...locales].map(q).join(",")];
  for (const k of keys) {
    const [g, f] = k.split("\u0000");
    const vals = byKey.get(k) ?? {};
    lines.push(
      [
        g,
        String((pos.get(g) ?? 0) + 1),
        f,
        ...locales.map((l) => vals[l] ?? ""),
      ]
        .map(q)
        .join(","),
    );
  }
  return lines.join("\n") + "\n";
}

/** Import the CSV produced by exportCopyCsv: updates copy rows and re-applies text to every matching screen. */
export async function importCopyCsv(
  projectId: string,
  csv: string,
): Promise<{ updated: number }> {
  const p = await getProject(projectId);
  const table = parseCsv(csv);
  if (!table.length) throw new BadRequest("Empty CSV");
  const [header, ...body] = table;
  const locales = header.slice(3);
  let updated = 0;
  for (const row of body) {
    const [groupId, , field] = row;
    if (!groupId || !field) continue;
    for (const [li, locale] of locales.entries()) {
      const value = row[3 + li];
      if (value === undefined || value === "") continue;
      await upsertCopy(p.id, groupId, locale, field, value);
      const targets = await db
        .select()
        .from(screens)
        .where(
          and(
            eq(screens.projectId, p.id),
            eq(screens.groupId, groupId),
            eq(screens.locale, locale),
          ),
        );
      for (const t of targets) {
        const scene = applyCopy(t.scene, field, value);
        if (scene !== t.scene) {
          await db
            .update(screens)
            .set({ scene, updatedAt: new Date() })
            .where(eq(screens.id, t.id));
          updated++;
        }
      }
    }
  }
  await touch(p.id);
  return { updated };
}

/** Field -> text layer mapping: title = first text layer, subtitle = second, bulletN = Nth after those. */
function applyCopy(scene: Scene, field: string, value: string): Scene {
  const texts = scene.layers.filter((l) => l.type === "text");
  const idx =
    field === "title"
      ? 0
      : field === "subtitle"
        ? 1
        : field.startsWith("bullet")
          ? 1 + Number(field.slice(6))
          : -1;
  // feature-list has no subtitle: bullets start at index 1.
  const hasSubtitle =
    texts.length > 1 && !scene.layers.some((l) => l.type === "icon");
  const target =
    texts[field.startsWith("bullet") ? (hasSubtitle ? idx : idx - 1) : idx];
  if (!target || target.type !== "text" || target.text === value) return scene;
  return {
    ...scene,
    layers: scene.layers.map((l) =>
      l.id === target.id ? { ...l, text: value } : l,
    ),
  };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else cur += c;
  }
  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v !== ""));
}

export async function updateScreen(
  screenId: string,
  patch: { scene?: unknown; position?: number; locale?: string },
) {
  const s = await getScreen(screenId);
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

export async function deleteScreen(screenId: string) {
  const s = await getScreen(screenId);
  await db.delete(screens).where(eq(screens.id, s.id));
  await touch(s.projectId);
}

export async function duplicateScreen(
  screenId: string,
  into?: { locale?: string; device?: DeviceId },
) {
  const s = await getScreen(screenId);
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

export async function reorderScreens(projectId: string, orderedIds: string[]) {
  await getProject(projectId);
  await Promise.all(
    orderedIds.map((id, i) =>
      db.update(screens).set({ position: i }).where(eq(screens.id, id)),
    ),
  );
}

// ---- export ----

export async function renderScreen(screenId: string): Promise<Buffer> {
  const s = await getScreen(screenId);
  return renderSceneToPng(s.scene);
}

export function exportFileName(s: Screen) {
  const d = DEVICES[s.device as DeviceId];
  return `${s.locale}/${d?.store ?? "store"}-${s.device}-${String(s.position + 1).padStart(2, "0")}.png`;
}

export async function exportZip(
  projectId: string,
  filter?: { locale?: string; device?: string; ids?: string[] },
): Promise<Buffer> {
  let rows = await listScreens(projectId, filter);
  if (filter?.ids?.length) {
    const set = new Set(filter.ids);
    rows = rows.filter((r) => set.has(r.id));
  }
  if (!rows.length) throw new BadRequest("No screens to export");
  const files: Record<string, Uint8Array> = {};
  for (const s of rows)
    files[exportFileName(s)] = new Uint8Array(await renderSceneToPng(s.scene));
  return Buffer.from(zipSync(files, { level: 0 }));
}

export async function screensByIds(ids: string[]) {
  if (!ids.length) return [];
  return db.select().from(screens).where(inArray(screens.id, ids));
}

// ---- derive (iPad / duo from an existing iPhone set) ----

export type DeriveTarget = "duo-outer" | "duo-inner" | "ipad";
export type DeriveInput = {
  from: { device: DeviceId };
  to: DeriveTarget;
  /** Defaults to every locale the source device has. */
  locales?: string[];
};

/** Pull title/subtitle/screenshot/colors back out of a rendered scene, so a
 * derived screen can be rebuilt (not stretched) on another device while
 * matching the source look exactly, even though the scene has no stored
 * template id. */
function extractScreenStyle(scene: Scene) {
  const texts = scene.layers.filter(
    (l): l is TextLayer => l.type === "text",
  );
  const mockups = scene.layers.filter(
    (l): l is MockupLayer => l.type === "mockup",
  );
  const title = texts[0];
  const subtitle = texts[1];
  const mock = mockups[0];
  const brand: Partial<Brand> = {
    background: scene.background,
    textColor: title?.color ?? DEFAULT_BRAND.textColor,
    accent: subtitle?.color ?? title?.color ?? DEFAULT_BRAND.accent,
    frameColor: mock?.frameColor ?? DEFAULT_BRAND.frameColor,
    titleWeight: title?.fontWeight ?? DEFAULT_BRAND.titleWeight,
    titleCase: title?.textTransform ?? DEFAULT_BRAND.titleCase,
    fontFamily: title?.fontFamily ?? DEFAULT_BRAND.fontFamily,
  };
  return {
    title: title?.text ?? "",
    subtitle: subtitle?.text,
    screenshot: mock?.src ?? null,
    brand,
    subFont: subtitle?.fontFamily,
    subColor: subtitle?.color,
    subWeight: subtitle?.fontWeight,
  };
}

/** Title/subtitle use one brand font in buildScene; patch the subtitle layer
 * back to the source screen's exact font/color/weight (titles and subtitles
 * can use different families, e.g. Archivo SemiExpanded vs Archivo). */
function patchSubtitleStyle(
  scene: Scene,
  style: ReturnType<typeof extractScreenStyle>,
): Scene {
  if (!style.subFont && !style.subColor && style.subWeight == null)
    return scene;
  const sub = scene.layers.filter((l) => l.type === "text")[1];
  if (!sub) return scene;
  return {
    ...scene,
    layers: scene.layers.map((l) =>
      l.id === sub.id && l.type === "text"
        ? {
            ...l,
            fontFamily: style.subFont ?? l.fontFamily,
            color: style.subColor ?? l.color,
            fontWeight: style.subWeight ?? l.fontWeight,
          }
        : l,
    ),
  };
}

function targetDeviceFor(to: DeriveTarget): DeviceId {
  if (to === "ipad") return "ipad-13";
  return to === "duo-outer" ? "iphone-duo-outer" : "iphone-duo-inner";
}

/**
 * Rebuild each screen of an existing device set on another device: re-lays
 * the same title/subtitle/screenshot out on the target (ipad-13, or the
 * iPhone Duo's outer/inner display) with `title-top`, title on top and the
 * device large. There is no Duo simulator, so the iPhone-shaped screenshot
 * is kept as-is and shown letterboxed inside the Duo frame (see scene-view).
 * Writes to the target's own device id, so the source set is never touched.
 * Re-running for the same locale replaces only the previously derived set.
 */
export async function deriveScreens(
  projectId: string,
  input: DeriveInput,
): Promise<Screen[]> {
  const p = await getProject(projectId);
  const targetDeviceId = targetDeviceFor(input.to);
  const targetDevice = getDevice(targetDeviceId);
  const source = await listScreens(p.id, { device: input.from.device });
  if (!source.length)
    throw new BadRequest(`No screens for device ${input.from.device}`);
  const locales = input.locales?.length
    ? input.locales
    : [...new Set(source.map((s) => s.locale))];

  const inserted: Screen[] = [];
  for (const locale of locales) {
    const src = source
      .filter((s) => s.locale === locale)
      .sort((a, b) => a.position - b.position);
    if (!src.length) continue;
    await db
      .delete(screens)
      .where(
        and(
          eq(screens.projectId, p.id),
          eq(screens.locale, locale),
          eq(screens.device, targetDeviceId),
        ),
      );
    // Native captures for the target device win over the iPhone screenshot:
    // assets named "<device>-<locale>-<NN>.png" (NN = 01-based position).
    const assets = await listAssets(p.id);
    const nativeFor = (i: number) => {
      const name = `${targetDeviceId}-${locale}-${String(i + 1).padStart(2, "0")}.png`;
      return assets.find((a) => a.name === name)?.url ?? null;
    };
    // When native captures exist for this device, only derive the screens
    // that have one; a letterboxed iPhone shot would look out of place.
    const hasNative = src.some((_, i) => nativeFor(i));
    const picked = src
      .map((s, i) => ({ s, native: nativeFor(i) }))
      .filter((x) => !hasNative || x.native);
    const rows = picked.map(({ s, native }, i) => {
      const style = extractScreenStyle(s.scene);
      let scene = buildScene(targetDevice, "title-top", {
        title: style.title,
        subtitle: style.subtitle,
        screenshot: native ?? style.screenshot,
        brand: style.brand,
      });
      if (native)
        scene = {
          ...scene,
          layers: scene.layers.map((l) =>
            l.type === "mockup" ? { ...l, screenFit: "cover" as const } : l,
          ),
        };
      scene = patchSubtitleStyle(scene, style);
      return {
        projectId: p.id,
        locale,
        device: targetDeviceId,
        position: i,
        groupId: s.groupId,
        scene,
      };
    });
    inserted.push(...(await db.insert(screens).values(rows).returning()));
  }
  await touch(p.id);
  return inserted;
}

// ---- Apple export (every App Store size, every locale, in one ZIP) ----

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Strip the alpha channel and pin the exact pixel size: App Store Connect
 * rejects screenshots that carry any alpha channel, even fully opaque. */
async function flattenForStore(
  png: Buffer,
  width: number,
  height: number,
): Promise<Uint8Array> {
  const out = await sharp(png)
    .resize(width, height, { fit: "fill" })
    .flatten({ background: "#ffffff" })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer();
  return new Uint8Array(out);
}

const CREATIVE_IDS = ["appstore-header", "appstore-search", "appstore-universal"] as const;

/** Render creative-asset screens (header / search / universal) per locale. */
async function creativeFiles(
  all: Screen[],
  prefix: (locale: string) => string,
): Promise<Record<string, Uint8Array>> {
  const files: Record<string, Uint8Array> = {};
  for (const s of all) {
    if (!(CREATIVE_IDS as readonly string[]).includes(s.device)) continue;
    const d = DEVICES[s.device as DeviceId];
    const same = all.filter((x) => x.locale === s.locale && x.device === s.device);
    const suffix =
      same.length > 1
        ? `-${pad2(same.sort((a, b) => a.position - b.position).indexOf(s) + 1)}`
        : "";
    files[`${prefix(s.locale)}${s.device}${suffix}.png`] = await flattenForStore(
      await renderSceneToPng(s.scene),
      d.width,
      d.height,
    );
  }
  return files;
}

export async function exportCreativeZip(projectId: string): Promise<Buffer> {
  const p = await getProject(projectId);
  const all = await listScreens(p.id);
  const files = await creativeFiles(all, (l) => `${l}/`);
  if (!Object.keys(files).length)
    throw new BadRequest("No creative asset screens (appstore-header/search/universal)");
  files["README.txt"] = new TextEncoder().encode(creativeReadme());
  return Buffer.from(zipSync(files, { level: 0 }));
}

function creativeReadme(): string {
  return `Screeny App Store creative assets (iOS 27 / iPadOS 27 and later)
=================================================================

Upload in App Store Connect > Asset Library (or with a new app version),
then pick them on the product page, custom product pages or a product page
optimization test. RGB PNG, no alpha, at Apple's template size:

  <locale>/appstore-header.png      Product page header   (3840x1646)
  <locale>/appstore-search.png      Search results asset  (3840x2560)
  <locale>/appstore-universal.png   Universal asset       (5244x2950)

Key content sits inside Apple's Art Safe Area; the rest may be cropped on
smaller devices. Check the result in App Store Connect's product page
preview before submitting. Rules: no prices, discounts, URLs, awards or
other platforms' logos; 4+ content only.
Generated by Screeny.
`;
}

function appleReadme(locales: string[]): string {
  return `Screeny Apple App Store export
================================

Upload each folder to the matching screenshot slot in App Store Connect
(each image is already flattened to RGB, no alpha channel, at the exact
required pixel size):

  <locale>/iphone-6.9/          iPhone 6.9" Display       (1320x2868)
  <locale>/iphone-6.5/          iPhone 6.5" Display       (1242x2688)
  <locale>/iphone-duo-outer/    iPhone Duo, outer display (1398x2034)  [only if Duo screens exist]
  <locale>/iphone-duo-inner/    iPhone Duo, inner display (2007x2853) [only if Duo screens exist]
  <locale>/ipad-13/             iPad 13" Display          (2064x2752) [only if iPad screens exist]
  <locale>/creative/            Creative assets: product page header, search result,
                                universal (Asset Library, iOS 27+) [only if they exist]

The iPhone 6.5" folder is generated by rescaling the 6.9" set when no native
6.5" screens exist; App Store Connect accepts either size per its iPhone
Display requirements, so this folder is still a valid upload on its own.

iPhone Duo: App Store Connect does not accept Duo screenshot uploads yet
(support ships later in 2026) and only requires them starting April 2027.
Keep this folder ready and upload it once the slot opens.

iPad: only needed if the app actually supports iPad. If the app ships with
supportsTablet=false, treat this folder as optional / future-proofing
rather than something to upload today.

Locales included: ${locales.join(", ")}
Generated by Screeny.
`;
}

export async function exportAppleZip(projectId: string): Promise<Buffer> {
  const p = await getProject(projectId);
  const all = await listScreens(p.id);
  if (!all.length) throw new BadRequest("No screens to export");
  const locales = [...new Set(all.map((s) => s.locale))].sort();
  const by = (locale: string, device: string) =>
    all
      .filter((s) => s.locale === locale && s.device === device)
      .sort((a, b) => a.position - b.position);

  const files: Record<string, Uint8Array> = {};
  for (const locale of locales) {
    const nine = by(locale, "iphone-6.9");
    const sixfive = by(locale, "iphone-6.5");
    const ipad = by(locale, "ipad-13");
    const duoOuter = by(locale, "iphone-duo-outer");
    const duoInner = by(locale, "iphone-duo-inner");

    for (const [i, s] of nine.entries())
      files[`${locale}/iphone-6.9/${pad2(i + 1)}.png`] = await flattenForStore(
        await renderSceneToPng(s.scene),
        DEVICES["iphone-6.9"].width,
        DEVICES["iphone-6.9"].height,
      );

    const sixfiveSource = sixfive.length ? sixfive : nine;
    for (const [i, s] of sixfiveSource.entries()) {
      const scene = sixfive.length
        ? s.scene
        : rescaleScene(s.scene, DEVICES["iphone-6.5"]);
      files[`${locale}/iphone-6.5/${pad2(i + 1)}.png`] =
        await flattenForStore(
          await renderSceneToPng(scene),
          DEVICES["iphone-6.5"].width,
          DEVICES["iphone-6.5"].height,
        );
    }

    for (const [i, s] of ipad.entries())
      files[`${locale}/ipad-13/${pad2(i + 1)}.png`] = await flattenForStore(
        await renderSceneToPng(s.scene),
        DEVICES["ipad-13"].width,
        DEVICES["ipad-13"].height,
      );

    for (const [i, s] of duoOuter.entries())
      files[`${locale}/iphone-duo-outer/${pad2(i + 1)}.png`] =
        await flattenForStore(
          await renderSceneToPng(s.scene),
          DEVICES["iphone-duo-outer"].width,
          DEVICES["iphone-duo-outer"].height,
        );

    for (const [i, s] of duoInner.entries())
      files[`${locale}/iphone-duo-inner/${pad2(i + 1)}.png`] =
        await flattenForStore(
          await renderSceneToPng(s.scene),
          DEVICES["iphone-duo-inner"].width,
          DEVICES["iphone-duo-inner"].height,
        );
  }
  Object.assign(files, await creativeFiles(all, (l) => `${l}/creative/`));
  files["README.txt"] = new TextEncoder().encode(appleReadme(locales));
  return Buffer.from(zipSync(files, { level: 0 }));
}
