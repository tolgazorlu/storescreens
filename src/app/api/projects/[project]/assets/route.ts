import { withUser, json } from "@/lib/api";
import { addAsset, getProject, listAssets, BadRequest } from "@/lib/service";

type P = { project: string };

export const GET = withUser<P>(async (_req, { user, params }) => {
  const project = await getProject(user.id, params.project);
  return json(await listAssets(user.id, project.id));
});

/** multipart/form-data: files[] + kind (screenshot|logo|image). Also accepts JSON {name, kind, base64}. */
export const POST = withUser<P>(async (req, { user, params }) => {
  const project = await getProject(user.id, params.project);
  const ct = req.headers.get("content-type") ?? "";
  const out = [];
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const kind = (form.get("kind") as string) || "screenshot";
    const files = form
      .getAll("files")
      .filter((f): f is File => f instanceof File);
    if (!files.length) throw new BadRequest("No files");
    for (const f of files) {
      out.push(
        await addAsset(user.id, project.id, {
          name: f.name,
          data: Buffer.from(await f.arrayBuffer()),
          contentType: f.type || "image/png",
          kind: kind as "screenshot" | "logo" | "image",
        }),
      );
    }
  } else {
    const body = (await req.json()) as {
      name: string;
      kind?: string;
      base64: string;
      contentType?: string;
    };
    if (!body?.base64) throw new BadRequest("base64 required");
    out.push(
      await addAsset(user.id, project.id, {
        name: body.name ?? "image.png",
        data: Buffer.from(body.base64.replace(/^data:[^,]+,/, ""), "base64"),
        contentType: body.contentType ?? "image/png",
        kind: (body.kind as "screenshot" | "logo" | "image") ?? "screenshot",
      }),
    );
  }
  return json(out, { status: 201 });
});
