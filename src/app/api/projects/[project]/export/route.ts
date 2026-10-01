import { withUser } from "@/lib/api";
import { exportZip, getProject } from "@/lib/service";

export const maxDuration = 300;

export const GET = withUser<{ project: string }>(
  async (req, { user, params }) => {
    const project = await getProject(user.id, params.project);
    const url = new URL(req.url);
    const ids = url.searchParams.get("ids")?.split(",").filter(Boolean);
    const zip = await exportZip(user.id, project.id, {
      locale: url.searchParams.get("locale") ?? undefined,
      device: url.searchParams.get("device") ?? undefined,
      ids,
    });
    return new Response(new Uint8Array(zip), {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${project.slug}-screenshots.zip"`,
      },
    });
  },
);
