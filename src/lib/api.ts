import "server-only";
import { NextResponse } from "next/server";

type Handler<P> = (req: Request, ctx: { params: P }) => Promise<Response>;

/** Wrap a route handler with error mapping. No auth: Screeny is a local, single-user tool. */
export function route<P = Record<string, string>>(handler: Handler<P>) {
  return async (req: Request, ctx: { params: Promise<P> }) => {
    try {
      return await handler(req, { params: await ctx.params });
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
