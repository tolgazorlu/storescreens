import { createMcpHandler } from "mcp-handler";
import { AsyncLocalStorage } from "node:async_hooks";
import { z } from "zod";
import { DEVICES } from "@/lib/devices";
import type { DeviceId } from "@/lib/devices";
import {
  TEMPLATE_IDS,
  TEMPLATE_LABELS,
  type TemplateId,
} from "@/lib/templates";
import { generateSchema } from "@/lib/validation";
import {
  addAsset,
  createProject,
  deleteScreen,
  exportZip,
  exportToDir,
  generateScreens,
  getProject,
  getScreen,
  listAssets,
  listProjects,
  listScreens,
  updateScreen,
  updateBrand,
  projectBrand,
  propagateLayout,
  exportCopyCsv,
  importCopyCsv,
  exportFileName,
} from "@/lib/service";
import { storeFile } from "@/lib/storage";
import { brandSchema, BRAND_PRESETS, applyPreset } from "@/lib/brand";
import { ICON_IDS } from "@/lib/icons";

// Local single-user tool: no auth. The server only listens on localhost.

/** Request origin, so tool results can return absolute URLs the agent can fetch. */
const originStore = new AsyncLocalStorage<string>();
const origin = () => originStore.getStore() ?? "http://localhost:3000";

export const maxDuration = 300;

const text = (data: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
    },
  ],
});

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "list_meta",
      {
        title: "Devices and templates",
        description:
          "Returns supported export devices (App Store / Google Play sizes) and layout templates. Call this first.",
        inputSchema: z.object({}),
      },
      async () =>
        text({
          brandPresets: Object.entries(BRAND_PRESETS).map(([id, p]) => ({
            id,
            label: p.label,
          })),
          icons: ICON_IDS,
          devices: Object.values(DEVICES),
          templates: TEMPLATE_IDS.map((id) => ({
            id,
            label: TEMPLATE_LABELS[id],
          })),
        }),
    );

    server.registerTool(
      "list_projects",
      {
        title: "List projects",
        description: "List the user's Screeny projects (apps).",
        inputSchema: z.object({}),
      },
      async () => text(await listProjects()),
    );

    server.registerTool(
      "create_project",
      {
        title: "Create project",
        description: "Create a project for an app.",
        inputSchema: z.object({ name: z.string() }),
      },
      async ({ name }) => text(await createProject(name)),
    );

    server.registerTool(
      "get_project",
      {
        title: "Get project",
        description:
          "Project details including uploaded assets (screenshots, logos) and existing screens.",
        inputSchema: z.object({
          project: z.string().describe("Project id or slug"),
        }),
      },
      async ({ project }) => {
        const p = await getProject(project);
        const [assetRows, screenRows] = await Promise.all([
          listAssets(p.id),
          listScreens(p.id),
        ]);
        return text({
          ...p,
          brand: projectBrand(p),
          assets: assetRows,
          screens: screenRows.map((s) => ({
            id: s.id,
            locale: s.locale,
            device: s.device,
            position: s.position,
            file: exportFileName(s),
          })),
        });
      },
    );

    server.registerTool(
      "upload_asset",
      {
        title: "Upload asset",
        description:
          "Upload an in-app screenshot or logo as base64 PNG/JPEG. Returns the asset id to reference in generate_screens. For local files, read them and base64 encode.",
        inputSchema: z.object({
          project: z.string(),
          name: z.string().describe("File name, e.g. home-tr.png"),
          kind: z.enum(["screenshot", "logo", "image"]).default("screenshot"),
          base64: z.string(),
          contentType: z.string().default("image/png"),
        }),
      },
      async ({ project, name, kind, base64, contentType }) => {
        const p = await getProject(project);
        const a = await addAsset(p.id, {
          name,
          kind,
          contentType,
          data: Buffer.from(base64.replace(/^data:[^,]+,/, ""), "base64"),
        });
        return text(a);
      },
    );

    server.registerTool(
      "set_brand",
      {
        title: "Set project brand",
        description:
          "Store colors, font, title style and template defaults on the project. generate_screens uses them unless overridden. " +
          `Pass preset to start from one of: ${Object.keys(BRAND_PRESETS).join(", ")}; then any brand fields override it.`,
        inputSchema: z.object({
          project: z.string(),
          preset: z.string().optional(),
          brand: brandSchema.partial().optional(),
        }),
      },
      async ({ project, preset, brand }) => {
        const p = await getProject(project);
        const base = preset ? applyPreset(preset) : projectBrand(p);
        const row = await updateBrand(p.id, { ...base, ...(brand ?? {}) });
        return text(projectBrand(row));
      },
    );

    server.registerTool(
      "generate_screens",
      {
        title: "Generate screens",
        description:
          "Create store screenshots for one locale + device from templates. Each entry gives a template, title, subtitle and a screenshot asset id (or name). " +
          "Pass locales=[...] with {locale: value} maps for title/subtitle/screenshot to generate every language in one call, or locale for one. Call once per device. Use replace=true to regenerate. Keep titles short (2-6 words) and in the target language. " +
          "Per screen: titleScale / phoneScale / phoneOffsetY tune the layout; feature-list takes bullets [{icon?, text}]; two-phones takes screenshot2. Project brand supplies colors unless brand is passed.",
        inputSchema: generateSchema.extend({ project: z.string() }),
      },
      async ({ project, ...input }) => {
        const p = await getProject(project);
        const rows = await generateScreens(p.id, {
          ...input,
          device: input.device as DeviceId,
          screens: input.screens.map((s) => ({
            ...s,
            template: s.template as TemplateId,
          })),
        });
        const base = origin();
        return text({
          created: rows.map((s) => ({
            id: s.id,
            locale: s.locale,
            device: s.device,
            position: s.position,
            preview: `${base}/api/screens/${s.id}/png`,
          })),
          editor: `${base}/p/${p.slug}`,
        });
      },
    );

    server.registerTool(
      "update_screen_text",
      {
        title: "Update screen text",
        description:
          "Replace the text of the Nth text layer (0 = title, 1 = subtitle) on a screen. Use for localization tweaks.",
        inputSchema: z.object({
          screen: z.string(),
          index: z.number().int().min(0).default(0),
          text: z.string(),
        }),
      },
      async ({ screen, index, text: value }) => {
        const s = await getScreen(screen);
        const texts = s.scene.layers.filter((l) => l.type === "text");
        const target = texts[index];
        if (!target) throw new Error(`No text layer at index ${index}`);
        const scene = {
          ...s.scene,
          layers: s.scene.layers.map((l) =>
            l.id === target.id && l.type === "text" ? { ...l, text: value } : l,
          ),
        };
        await updateScreen(s.id, { scene });
        return text({ ok: true });
      },
    );

    server.registerTool(
      "propagate_layout",
      {
        title: "Propagate layout to other locales",
        description:
          "Copy positions, sizes and styles from one screen to the same screen in other locales (text and screenshots stay).",
        inputSchema: z.object({
          screen: z.string(),
          locales: z.array(z.string()).optional(),
        }),
      },
      async ({ screen, locales }) =>
        text({
          updated: (await propagateLayout(screen, locales)).map((r) => ({
            id: r.id,
            locale: r.locale,
          })),
        }),
    );

    server.registerTool(
      "export_copy_csv",
      {
        title: "Export copy as CSV",
        description:
          "All titles/subtitles/bullets as CSV (group, screen, field, one column per locale) for translators.",
        inputSchema: z.object({ project: z.string() }),
      },
      async ({ project }) =>
        text(await exportCopyCsv((await getProject(project)).id)),
    );

    server.registerTool(
      "import_copy_csv",
      {
        title: "Import copy CSV",
        description:
          "Import a CSV in the export_copy_csv format; updates the text on every matching screen. Add new locale columns to translate.",
        inputSchema: z.object({ project: z.string(), csv: z.string() }),
      },
      async ({ project, csv }) =>
        text(await importCopyCsv((await getProject(project)).id, csv)),
    );

    server.registerTool(
      "delete_screen",
      {
        title: "Delete screen",
        description: "Delete a screen by id.",
        inputSchema: z.object({ screen: z.string() }),
      },
      async ({ screen }) => {
        await deleteScreen(screen);
        return text({ ok: true });
      },
    );

    server.registerTool(
      "export_zip",
      {
        title: "Export",
        description:
          'Render screens to store-ready PNGs. Filter by locales and devices; 6.5" and 6.1" are derived from the 6.9" scenes automatically. ' +
          "Files are <locale>/<device>/<nn>-<slug>.png, or with asc=true the App Store Connect folder names. " +
          "Default returns a ZIP URL; pass dir to write PNGs straight into that directory instead.",
        inputSchema: z.object({
          project: z.string(),
          locales: z.array(z.string()).optional(),
          devices: z.array(z.string()).optional(),
          asc: z.boolean().optional(),
          dir: z
            .string()
            .optional()
            .describe("Absolute directory to write into (no ZIP)"),
        }),
      },
      async ({ project, locales, devices, asc, dir }) => {
        const p = await getProject(project);
        const opts = {
          locales,
          devices: devices as DeviceId[] | undefined,
          asc,
        };
        if (dir)
          return text({ dir, files: await exportToDir(p.id, dir, opts) });
        const zip = await exportZip(p.id, opts);
        const url = await storeFile({
          dir: `exports/${p.id}`,
          name: `${p.slug}-${locales?.join("+") ?? "all"}.zip`,
          data: zip,
          contentType: "application/zip",
        });
        return text({ url: origin() + url, bytes: zip.length });
      },
    );
  },
  { serverInfo: { name: "screeny", version: "0.1.0" } },
);

const withOrigin = (req: Request) =>
  originStore.run(new URL(req.url).origin, () => handler(req));

export { withOrigin as GET, withOrigin as POST, withOrigin as DELETE };
