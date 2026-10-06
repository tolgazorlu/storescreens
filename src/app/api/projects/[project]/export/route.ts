import { route, json } from "@/lib/api";
import { exportToDir, exportZip, getProject, planExport } from "@/lib/service";
import type { DeviceId } from "@/lib/devices";

export const maxDuration = 300;

/**
 * ?locales=tr,en&devices=iphone-6.9,iphone-6.5&ids=...&asc=1
 * Default: ZIP download. ?zip=false&dir=/abs/path writes PNGs there instead.
 * ?plan=1 returns the file list without rendering.
 */
export const GET = route<{ project: string }>(async (req, { params }) => {
  const project = await getProject(params.project);
  const q = new URL(req.url).searchParams;
  const list = (k: string) =>
    q
      .get(k)
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  const opts = {
    locales:
      list("locales") ?? (q.get("locale") ? [q.get("locale")!] : undefined),
    devices: (list("devices") ??
      (q.get("device") ? [q.get("device")!] : undefined)) as
      DeviceId[] | undefined,
    ids: list("ids"),
    asc: q.get("asc") === "1" || q.get("asc") === "true",
  };
  if (q.get("plan"))
    return json(
      (await planExport(project.id, opts)).map((f) => ({
        path: f.path,
        locale: f.locale,
        device: f.device,
      })),
    );
  if (q.get("zip") === "false") {
    const dir = q.get("dir");
    if (!dir)
      return json({ error: "dir is required when zip=false" }, { status: 400 });
    return json({ dir, files: await exportToDir(project.id, dir, opts) });
  }
  const zip = await exportZip(project.id, opts);
  return new Response(new Uint8Array(zip), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${project.slug}-screenshots.zip"`,
    },
  });
});
