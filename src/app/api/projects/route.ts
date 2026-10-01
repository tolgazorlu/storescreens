import { z } from "zod";
import { withUser, json } from "@/lib/api";
import { createProject, listProjects } from "@/lib/service";

export const GET = withUser(async (_req, { user }) =>
  json(await listProjects(user.id)),
);

export const POST = withUser(async (req, { user }) => {
  const body = z
    .object({ name: z.string().min(1).max(80) })
    .parse(await req.json());
  return json(await createProject(user.id, body.name), { status: 201 });
});
