import { z } from "zod";
import { withUser, json } from "@/lib/api";
import {
  generateScreens,
  getProject,
  listScreens,
  reorderScreens,
} from "@/lib/service";
import { generateSchema } from "@/lib/validation";
import type { DeviceId } from "@/lib/devices";
import type { TemplateId } from "@/lib/templates";

type P = { project: string };

export const GET = withUser<P>(async (req, { user, params }) => {
  const project = await getProject(user.id, params.project);
  const url = new URL(req.url);
  return json(
    await listScreens(user.id, project.id, {
      locale: url.searchParams.get("locale") ?? undefined,
      device: url.searchParams.get("device") ?? undefined,
    }),
  );
});

/** Generate screens from templates. */
export const POST = withUser<P>(async (req, { user, params }) => {
  const project = await getProject(user.id, params.project);
  const body = generateSchema.parse(await req.json());
  const rows = await generateScreens(user.id, project.id, {
    ...body,
    device: body.device as DeviceId,
    screens: body.screens.map((s) => ({
      ...s,
      template: s.template as TemplateId,
    })),
  });
  return json(rows, { status: 201 });
});

/** Reorder: { ids: [...] } */
export const PATCH = withUser<P>(async (req, { user, params }) => {
  const project = await getProject(user.id, params.project);
  const body = z.object({ ids: z.array(z.string()) }).parse(await req.json());
  await reorderScreens(user.id, project.id, body.ids);
  return json({ ok: true });
});
