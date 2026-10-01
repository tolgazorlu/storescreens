import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { getUserByApiKey } from "@/lib/auth";
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
  generateScreens,
  getProject,
  listAssets,
  listProjects,
  listScreens,
  updateScreen,
  exportFileName,
} from "@/lib/service";
import { storeFile } from "@/lib/storage";

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
      async (_a, ctx) => text(await listProjects(uid(ctx))),
    );

    server.registerTool(
      "create_project",
      {
        title: "Create project",
        description: "Create a project for an app.",
        inputSchema: z.object({ name: z.string() }),
      },
      async ({ name }, ctx) => text(await createProject(uid(ctx), name)),
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
      async ({ project }, ctx) => {
        const u = uid(ctx);
        const p = await getProject(u, project);
        const [assetRows, screenRows] = await Promise.all([
          listAssets(u, p.id),
          listScreens(u, p.id),
        ]);
        return text({
          ...p,
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
      async ({ project, name, kind, base64, contentType }, ctx) => {
        const u = uid(ctx);
        const p = await getProject(u, project);
        const a = await addAsset(u, p.id, {
          name,
          kind,
          contentType,
          data: Buffer.from(base64.replace(/^data:[^,]+,/, ""), "base64"),
        });
        return text(a);
      },
    );

    server.registerTool(
      "generate_screens",
      {
        title: "Generate screens",
        description:
          "Create store screenshots for one locale + device from templates. Each entry gives a template, title, subtitle and a screenshot asset id (or name). " +
          "Call once per locale and per device. Use replace=true to regenerate. Keep titles short (2-6 words) and in the target language.",
        inputSchema: generateSchema.extend({ project: z.string() }),
      },
      async ({ project, ...input }, ctx) => {
        const u = uid(ctx);
        const p = await getProject(u, project);
        const rows = await generateScreens(u, p.id, {
          ...input,
          device: input.device as DeviceId,
          screens: input.screens.map((s) => ({
            ...s,
            template: s.template as TemplateId,
          })),
        });
        const base = process.env.APP_URL ?? "";
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
      async ({ screen, index, text: value }, ctx) => {
        const u = uid(ctx);
        const { getScreen } = await import("@/lib/service");
        const s = await getScreen(u, screen);
        const texts = s.scene.layers.filter((l) => l.type === "text");
        const target = texts[index];
        if (!target) throw new Error(`No text layer at index ${index}`);
        const scene = {
          ...s.scene,
          layers: s.scene.layers.map((l) =>
            l.id === target.id && l.type === "text" ? { ...l, text: value } : l,
          ),
        };
        await updateScreen(u, s.id, { scene });
        return text({ ok: true });
      },
    );

    server.registerTool(
      "delete_screen",
      {
        title: "Delete screen",
        description: "Delete a screen by id.",
        inputSchema: z.object({ screen: z.string() }),
      },
      async ({ screen }, ctx) => {
        await deleteScreen(uid(ctx), screen);
        return text({ ok: true });
      },
    );

    server.registerTool(
      "export_zip",
      {
        title: "Export ZIP",
        description:
          "Render all screens (optionally filtered by locale/device) to store-ready PNGs and return a download URL for the ZIP. Files are named <locale>/<store>-<device>-<nn>.png.",
        inputSchema: z.object({
          project: z.string(),
          locale: z.string().optional(),
          device: z.string().optional(),
        }),
      },
      async ({ project, locale, device }, ctx) => {
        const u = uid(ctx);
        const p = await getProject(u, project);
        const zip = await exportZip(u, p.id, { locale, device });
        const url = await storeFile({
          dir: `exports/${p.id}`,
          name: `${p.slug}-${locale ?? "all"}-${device ?? "all"}.zip`,
          data: zip,
          contentType: "application/zip",
        });
        const base = process.env.APP_URL ?? "";
        return text({
          url: url.startsWith("/") ? base + url : url,
          bytes: zip.length,
        });
      },
    );
  },
  { serverInfo: { name: "screeny", version: "0.1.0" } },
);

function uid(ctx: {
  http?: { authInfo?: { clientId?: string; extra?: Record<string, unknown> } };
}) {
  const id = ctx.http?.authInfo?.extra?.userId as string | undefined;
  if (!id) throw new Error("Unauthorized");
  return id;
}

const authed = withMcpAuth(
  handler,
  async (_req, token) => {
    if (!token) return undefined;
    const user = await getUserByApiKey(token);
    if (!user) return undefined;
    return {
      token,
      clientId: user.email,
      scopes: ["all"],
      extra: { userId: user.id },
    };
  },
  { required: true },
);

export { authed as GET, authed as POST, authed as DELETE };
