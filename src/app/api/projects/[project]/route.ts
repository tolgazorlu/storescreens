import { z } from "zod";
import { route, json } from "@/lib/api";
import {
  getProject,
  renameProject,
  deleteProject,
  listAssets,
  listScreens,
} from "@/lib/service";

type P = { project: string };

export const GET = route<P>(async (_req, { params }) => {
  const project = await getProject(params.project);
  const [assetRows, screenRows] = await Promise.all([
    listAssets(project.id),
    listScreens(project.id),
  ]);
  return json({ ...project, assets: assetRows, screens: screenRows });
});

export const PATCH = route<P>(async (req, { params }) => {
  const body = z
    .object({ name: z.string().min(1).max(80) })
    .parse(await req.json());
  const project = await getProject(params.project);
  return json(await renameProject(project.id, body.name));
});

export const DELETE = route<P>(async (_req, { params }) => {
  const project = await getProject(params.project);
  await deleteProject(project.id);
  return json({ ok: true });
});
