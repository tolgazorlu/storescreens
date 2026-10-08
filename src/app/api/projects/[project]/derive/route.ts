import { route, json } from "@/lib/api";
import { deriveScreens, getProject } from "@/lib/service";
import { deriveSchema } from "@/lib/validation";
import type { DeviceId } from "@/lib/devices";

export const maxDuration = 300;

type P = { project: string };

/** Turn an existing screen set into an "ipad" or "duo" set on its own
 * device id, for every locale the source has (or a subset). */
export const POST = route<P>(async (req, { params }) => {
  const project = await getProject(params.project);
  const body = deriveSchema.parse(await req.json());
  const rows = await deriveScreens(project.id, {
    ...body,
    from: { device: body.from.device as DeviceId },
  });
  return json(rows, { status: 201 });
});
