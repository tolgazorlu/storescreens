import { z } from "zod";
import { DEVICE_IDS } from "@/lib/devices";
import { TEMPLATE_IDS } from "@/lib/templates";
import { IPHONE_FRAMES, LAYOUT_KEYS, STYLE_KEYS } from "@/lib/layouts";
import { backgroundSchema } from "@/lib/scene";
import { brandPatchSchema, BRAND_PRESETS } from "@/lib/brand";

/** BCP 47-ish tag; it becomes a folder name inside export ZIPs, so only safe characters. */
export const localeSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,9}$/, "locale must be 2-10 letters, digits, - or _");

const localized = z.union([z.string(), z.record(z.string(), z.string())]);

export const bulletSchema = z.object({
  icon: z.string().optional(),
  text: localized,
});

export const screenSpecSchema = z.object({
  /** Classic storescreens template. Optional when `layout` or the call's `style` picks a layout. */
  template: z.enum(TEMPLATE_IDS as [string, ...string[]]).optional(),
  /** goldie layout; wins over `template` and over the call's `style`. */
  layout: z.enum(LAYOUT_KEYS).optional(),
  title: localized.optional(),
  subtitle: localized.optional(),
  screenshot: localized.nullable().optional(),
  screenshot2: localized.nullable().optional(),
  screenshot3: localized.nullable().optional(),
  bullets: z.array(bulletSchema).max(4).optional(),
  titleScale: z.number().min(0.3).max(3).optional(),
  phoneScale: z.number().min(0.3).max(3).optional(),
  phoneOffsetY: z.number().min(-1).max(1).optional(),
  /** Small label above the title, on any layout with copy at the top. */
  eyebrow: localized.optional(),
  /** Call-to-action pill under the subtitle, e.g. on the last screen. */
  cta: localized.optional(),
});

export const generateSchema = z
  .object({
    locale: localeSchema.optional(),
    /** Generate for several locales in one call; title/subtitle/screenshot may then be {locale: value} maps. */
    locales: z.array(localeSchema).min(1).max(40).optional(),
    device: z.enum(DEVICE_IDS as [string, ...string[]]),
    logo: z.string().nullable().optional(),
    /** Named theme preset (see /api/meta `themes`): sets colours and background only, then `brand` can still override it. */
    theme: z.enum(Object.keys(BRAND_PRESETS) as [string, ...string[]]).optional(),
    /** Overrides on top of the project brand (and `theme`, if set) for this call. */
    brand: brandPatchSchema.optional(),
    /** Legacy shorthands; prefer brand. */
    background: backgroundSchema.optional(),
    textColor: z.string().optional(),
    fontFamily: z.string().optional(),
    replace: z.boolean().optional(),
    /** Also build the same design on every other device mockup. */
    allDevices: z.boolean().optional(),
    /** goldie template style: picks a layout per screen position for screens without template/layout. */
    style: z.enum(STYLE_KEYS).optional(),
    /** iPhone bezel colour for goldie layouts (Android uses the Pixel 10 Pro art). */
    frame: z.enum(IPHONE_FRAMES).optional(),
    screens: z.array(screenSpecSchema).min(1).max(10),
  })
  .refine((b) => b.locale || b.locales?.length, {
    message: "locale or locales is required",
  })
  .refine((b) => b.style || b.screens.every((s) => s.template || s.layout), {
    message: "each screen needs template or layout, unless style is set",
  });

export type GenerateBody = z.infer<typeof generateSchema>;

export const deriveSchema = z.object({
  from: z.object({ device: z.enum(DEVICE_IDS as [string, ...string[]]) }),
  to: z.enum(["duo-outer", "duo-inner", "ipad"]),
  locales: z.array(z.string()).optional(),
});

export type DeriveBody = z.infer<typeof deriveSchema>;
