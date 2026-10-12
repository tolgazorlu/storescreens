import { z } from "zod";
import { DEVICE_IDS } from "@/lib/devices";
import { TEMPLATE_IDS } from "@/lib/templates";
import { backgroundSchema } from "@/lib/scene";
import { brandSchema } from "@/lib/brand";

/** BCP 47-ish tag; it becomes a folder name inside export ZIPs, so only safe characters. */
export const localeSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,9}$/, "locale must be 2-10 letters, digits, - or _");

const localized = z.union([z.string(), z.record(z.string(), z.string())]);

export const bulletSchema = z.object({
  icon: z.string().optional(),
  text: localized,
});

export const screenSpecSchema = z.object({
  template: z.enum(TEMPLATE_IDS as [string, ...string[]]),
  title: localized.optional(),
  subtitle: localized.optional(),
  screenshot: localized.nullable().optional(),
  screenshot2: localized.nullable().optional(),
  screenshot3: localized.nullable().optional(),
  bullets: z.array(bulletSchema).max(4).optional(),
  titleScale: z.number().min(0.3).max(3).optional(),
  phoneScale: z.number().min(0.3).max(3).optional(),
  phoneOffsetY: z.number().min(-1).max(1).optional(),
});

export const generateSchema = z
  .object({
    locale: localeSchema.optional(),
    /** Generate for several locales in one call; title/subtitle/screenshot may then be {locale: value} maps. */
    locales: z.array(localeSchema).min(1).max(40).optional(),
    device: z.enum(DEVICE_IDS as [string, ...string[]]),
    logo: z.string().nullable().optional(),
    /** Overrides on top of the project brand for this call. */
    brand: brandSchema.partial().optional(),
    /** Legacy shorthands; prefer brand. */
    background: backgroundSchema.optional(),
    textColor: z.string().optional(),
    fontFamily: z.string().optional(),
    replace: z.boolean().optional(),
    screens: z.array(screenSpecSchema).min(1).max(10),
  })
  .refine((b) => b.locale || b.locales?.length, {
    message: "locale or locales is required",
  });

export type GenerateBody = z.infer<typeof generateSchema>;

export const deriveSchema = z.object({
  from: z.object({ device: z.enum(DEVICE_IDS as [string, ...string[]]) }),
  to: z.enum(["duo-outer", "duo-inner", "ipad"]),
  locales: z.array(z.string()).optional(),
});

export type DeriveBody = z.infer<typeof deriveSchema>;
