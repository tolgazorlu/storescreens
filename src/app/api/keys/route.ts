import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, apiKeys } from "@/lib/db";
import { generateApiKey } from "@/lib/auth";
import { withUser, json } from "@/lib/api";

export const GET = withUser(async (_req, { user }) =>
  json(
    await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        prefix: apiKeys.prefix,
        createdAt: apiKeys.createdAt,
        lastUsedAt: apiKeys.lastUsedAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, user.id)),
  ),
);

/** Returns the raw key once. */
export const POST = withUser(async (req, { user }) => {
  const { name } = z
    .object({ name: z.string().min(1).max(60) })
    .parse(await req.json());
  const { raw, prefix, hash } = generateApiKey();
  const [row] = await db
    .insert(apiKeys)
    .values({ userId: user.id, name, prefix, keyHash: hash })
    .returning();
  return json({ id: row.id, name, prefix, key: raw }, { status: 201 });
});

export const DELETE = withUser(async (req, { user }) => {
  const { id } = z.object({ id: z.string() }).parse(await req.json());
  await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, user.id)));
  return json({ ok: true });
});
