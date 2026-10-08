import { route } from "@/lib/api";
import { exportAppleZip, getProject } from "@/lib/service";

export const maxDuration = 300;

/** Every App Store size for every locale (iPhone 6.9/6.5, iPad 13 if
 * present, duo variants if present), flattened to RGB, as one ZIP with a
 * README pointing each folder at its App Store Connect slot. */
export const GET = route<{ project: string }>(async (_req, { params }) => {
  const project = await getProject(params.project);
  const zip = await exportAppleZip(project.id);
  return new Response(new Uint8Array(zip), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${project.slug}-appstore.zip"`,
    },
  });
});
