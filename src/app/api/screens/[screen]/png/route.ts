import { withUser } from "@/lib/api";
import { renderScreen } from "@/lib/service";

export const maxDuration = 60;

export const GET = withUser<{ screen: string }>(
  async (_req, { user, params }) => {
    const png = await renderScreen(user.id, params.screen);
    return new Response(new Uint8Array(png), {
      headers: {
        "content-type": "image/png",
        "cache-control": "no-store",
        "content-disposition": `inline; filename="${params.screen}.png"`,
      },
    });
  },
);
