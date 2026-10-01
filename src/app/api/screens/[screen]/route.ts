import { z } from "zod";
import { withUser, json } from "@/lib/api";
import {
  deleteScreen,
  duplicateScreen,
  getScreen,
  updateScreen,
} from "@/lib/service";
import type { DeviceId } from "@/lib/devices";

type P = { screen: string };

export const GET = withUser<P>(async (_req, { user, params }) =>
  json(await getScreen(user.id, params.screen)),
);

export const PATCH = withUser<P>(async (req, { user, params }) => {
  const body = z
    .object({
      scene: z.unknown().optional(),
      position: z.number().optional(),
      locale: z.string().optional(),
    })
    .parse(await req.json());
  return json(await updateScreen(user.id, params.screen, body));
});

export const DELETE = withUser<P>(async (_req, { user, params }) => {
  await deleteScreen(user.id, params.screen);
  return json({ ok: true });
});

/** Duplicate, optionally into another locale/device. */
export const POST = withUser<P>(async (req, { user, params }) => {
  const body = z
    .object({ locale: z.string().optional(), device: z.string().optional() })
    .parse(await req.json().catch(() => ({})));
  return json(
    await duplicateScreen(user.id, params.screen, {
      locale: body.locale,
      device: body.device as DeviceId | undefined,
    }),
    { status: 201 },
  );
});
