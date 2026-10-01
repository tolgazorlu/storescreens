import { z } from "zod";
import { withUser, json } from "@/lib/api";
import {
  getProject,
  renameProject,
  deleteProject,
  listAssets,
  listScreens,
} from "@/lib/service";

type P = { project: string };

export const GET = withUser<P>(async (_req, { user, params }) => {
  const project = await getProject(user.id, params.project);
  const [assetRows, screenRows] = await Promise.all([
    listAssets(user.id, project.id),
    listScreens(user.id, project.id),
  ]);
  return json({ ...project, assets: assetRows, screens: screenRows });
});

export const PATCH = withUser<P>(async (req, { user, params }) => {
  const body = z
    .object({ name: z.string().min(1).max(80) })
    .parse(await req.json());
  const project = await getProject(user.id, params.project);
  return json(await renameProject(user.id, project.id, body.name));
});

export const DELETE = withUser<P>(async (_req, { user, params }) => {
  const project = await getProject(user.id, params.project);
  await deleteProject(user.id, project.id);
  return json({ ok: true });
});
