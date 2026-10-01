import { withUser, json } from "@/lib/api";
import { deleteAsset, getProject } from "@/lib/service";

export const DELETE = withUser<{ project: string; asset: string }>(
  async (_req, { user, params }) => {
    const project = await getProject(user.id, params.project);
    await deleteAsset(user.id, project.id, params.asset);
    return json({ ok: true });
  },
);
