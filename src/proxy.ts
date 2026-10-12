import { NextResponse, type NextRequest } from "next/server";
import { rejectUnlessLocal } from "@/lib/guard";

export function proxy(req: NextRequest) {
  const refused = rejectUnlessLocal(req.headers);
  if (refused) return new NextResponse(refused, { status: 403 });
  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*", "/files/:path*"] };
