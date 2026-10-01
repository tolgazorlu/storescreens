import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { hashPassword, setSessionCookie, verifyPassword } from "@/lib/auth";
import { json, errorResponse } from "@/lib/api";

/** Email + password. First login with an unknown email creates the account (single-user tool). */
export async function POST(req: Request) {
  try {
    const { email, password } = z
      .object({ email: z.email(), password: z.string().min(8) })
      .parse(await req.json());
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    if (existing) {
      if (!verifyPassword(password, existing.passwordHash))
        return json({ error: "Invalid credentials" }, { status: 401 });
      await setSessionCookie(existing.id);
      return json({ id: existing.id, email: existing.email });
    }
    if (process.env.ALLOW_SIGNUP === "false")
      return json({ error: "Signup disabled" }, { status: 403 });
    const [count] = await db.select({ id: users.id }).from(users).limit(1);
    if (count && process.env.ALLOW_SIGNUP !== "true")
      return json({ error: "Signup disabled" }, { status: 403 });
    const [created] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash: hashPassword(password),
      })
      .returning();
    await setSessionCookie(created.id);
    return json({ id: created.id, email: created.email }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
