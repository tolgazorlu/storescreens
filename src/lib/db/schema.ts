import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { randomUUID } from "node:crypto";
import type { Scene } from "@/lib/scene";
import type { Brand } from "@/lib/brand";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID());
const now = (name: string) =>
  integer(name, { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

export const projects = sqliteTable("projects", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  brand: text("brand", { mode: "json" }).$type<Brand>(),
  createdAt: now("created_at"),
  updatedAt: now("updated_at"),
});

export const assets = sqliteTable("assets", {
  id: id(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // screenshot | logo | image
  name: text("name").notNull(),
  url: text("url").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  createdAt: now("created_at"),
});

export const screens = sqliteTable("screens", {
  id: id(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  locale: text("locale").notNull(),
  device: text("device").notNull(),
  position: integer("position").notNull().default(0),
  scene: text("scene", { mode: "json" }).$type<Scene>().notNull(),
  createdAt: now("created_at"),
  updatedAt: now("updated_at"),
});

export type Project = typeof projects.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Screen = typeof screens.$inferSelect;
