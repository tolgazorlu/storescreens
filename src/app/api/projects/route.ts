import { z } from "zod";
import { route, json } from "@/lib/api";
import { createProject, listProjects } from "@/lib/service";

export const GET = route(async () => json(await listProjects()));

export const POST = route(async (req) => {
  const body = z
    .object({ name: z.string().min(1).max(80) })
    .parse(await req.json());
  return json(await createProject(body.name), { status: 201 });
});
