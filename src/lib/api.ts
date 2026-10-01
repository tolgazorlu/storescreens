import "server-only";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import type { User } from "@/lib/db";

type Handler<P> = (
  req: Request,
  ctx: { user: User; params: P },
) => Promise<Response>;

/** Wrap a route handler with auth (API key or session) and error mapping. */
export function withUser<P = Record<string, string>>(handler: Handler<P>) {
  return async (req: Request, ctx: { params: Promise<P> }) => {
    const user = await getRequestUser(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
      return await handler(req, { user, params: await ctx.params });
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export function errorResponse(e: unknown) {
  const err = e as { status?: number; message?: string; issues?: unknown };
  if (err?.issues)
    return NextResponse.json(
      { error: "Validation failed", issues: err.issues },
      { status: 400 },
    );
  const status = typeof err?.status === "number" ? err.status : 500;
  if (status === 500) console.error(e);
  return NextResponse.json(
    { error: err?.message ?? "Internal error" },
    { status },
  );
}

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}
