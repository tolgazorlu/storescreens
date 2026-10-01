import { z } from "zod";
import { route, json } from "@/lib/api";
import {
  deleteScreen,
  duplicateScreen,
  getScreen,
  updateScreen,
} from "@/lib/service";
import type { DeviceId } from "@/lib/devices";

type P = { screen: string };

export const GET = route<P>(async (_req, { params }) =>
  json(await getScreen(params.screen)),
);

export const PATCH = route<P>(async (req, { params }) => {
  const body = z
    .object({
      scene: z.unknown().optional(),
      position: z.number().optional(),
      locale: z.string().optional(),
    })
    .parse(await req.json());
  return json(await updateScreen(params.screen, body));
});

export const DELETE = route<P>(async (_req, { params }) => {
  await deleteScreen(params.screen);
  return json({ ok: true });
});

/** Duplicate, optionally into another locale/device. */
export const POST = route<P>(async (req, { params }) => {
  const body = z
    .object({ locale: z.string().optional(), device: z.string().optional() })
    .parse(await req.json().catch(() => ({})));
  return json(
    await duplicateScreen(params.screen, {
      locale: body.locale,
      device: body.device as DeviceId | undefined,
    }),
    { status: 201 },
  );
});
