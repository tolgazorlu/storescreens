import { route, json } from "@/lib/api";
import { deleteAsset, getProject } from "@/lib/service";

export const DELETE = route<{ project: string; asset: string }>(
  async (_req, { params }) => {
    const project = await getProject(params.project);
    await deleteAsset(project.id, params.asset);
    return json({ ok: true });
  },
);
