import { z } from "zod";
import { route, json } from "@/lib/api";
import {
  getProject,
  renameProject,
  deleteProject,
  listAssets,
  listScreens,
  updateBrand,
  projectBrand,
} from "@/lib/service";
import { brandSchema } from "@/lib/brand";

type P = { project: string };

export const GET = route<P>(async (_req, { params }) => {
  const project = await getProject(params.project);
  const [assetRows, screenRows] = await Promise.all([
    listAssets(project.id),
    listScreens(project.id),
  ]);
  return json({
    ...project,
    brand: projectBrand(project),
    assets: assetRows,
    screens: screenRows,
  });
});

export const PATCH = route<P>(async (req, { params }) => {
  const body = z
    .object({
      name: z.string().min(1).max(80).optional(),
      brand: brandSchema.partial().optional(),
    })
    .parse(await req.json());
  let project = await getProject(params.project);
  if (body.name) project = await renameProject(project.id, body.name);
  if (body.brand) project = await updateBrand(project.id, body.brand);
  return json({ ...project, brand: projectBrand(project) });
});

export const DELETE = route<P>(async (_req, { params }) => {
  const project = await getProject(params.project);
  await deleteProject(project.id);
  return json({ ok: true });
});
