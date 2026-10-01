import { route } from "@/lib/api";
import { renderScreen } from "@/lib/service";

export const maxDuration = 60;

export const GET = route<{ screen: string }>(async (_req, { params }) => {
  const png = await renderScreen(params.screen);
  return new Response(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      "cache-control": "no-store",
      "content-disposition": `inline; filename="${params.screen}.png"`,
    },
  });
});
