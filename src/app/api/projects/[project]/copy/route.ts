import { route, json } from "@/lib/api";
import { exportCopyCsv, getProject, importCopyCsv } from "@/lib/service";

type P = { project: string };

/** CSV: group, screen, field, <locale columns>. */
export const GET = route<P>(async (_req, { params }) => {
  const project = await getProject(params.project);
  const csv = await exportCopyCsv(project.id);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${project.slug}-copy.csv"`,
    },
  });
});

/** Import the same CSV (text/csv body or multipart "file"). */
export const POST = route<P>(async (req, { params }) => {
  const project = await getProject(params.project);
  const ct = req.headers.get("content-type") ?? "";
  let csv: string;
  if (ct.includes("multipart/form-data")) {
    const f = (await req.formData()).get("file");
    if (!(f instanceof File))
      return json({ error: "file required" }, { status: 400 });
    csv = await f.text();
  } else csv = await req.text();
  return json(await importCopyCsv(project.id, csv));
});
