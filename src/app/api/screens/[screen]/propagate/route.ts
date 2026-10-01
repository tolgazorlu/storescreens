import { z } from "zod";
import { route, json } from "@/lib/api";
import { propagateLayout } from "@/lib/service";

/** Copy this screen's layout to its siblings in other locales. Body: { locales?: string[] } */
export const POST = route<{ screen: string }>(async (req, { params }) => {
  const body = z
    .object({ locales: z.array(z.string()).optional() })
    .parse(await req.json().catch(() => ({})));
  const rows = await propagateLayout(params.screen, body.locales);
  return json({ updated: rows.map((r) => ({ id: r.id, locale: r.locale })) });
});
