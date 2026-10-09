import { route } from "@/lib/api";
import { exportCreativeZip, getProject } from "@/lib/service";

export const maxDuration = 300;

/** App Store creative assets (product page header, search result,
 * universal) per locale, flattened to RGB, with a README. */
export const GET = route<{ project: string }>(async (_req, { params }) => {
  const project = await getProject(params.project);
  const zip = await exportCreativeZip(project.id);
  return new Response(new Uint8Array(zip), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${project.slug}-creative-assets.zip"`,
    },
  });
});
