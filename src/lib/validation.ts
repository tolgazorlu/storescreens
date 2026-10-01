import { z } from "zod";
import { DEVICE_IDS } from "@/lib/devices";
import { TEMPLATE_IDS } from "@/lib/templates";
import { backgroundSchema } from "@/lib/scene";
import { brandSchema } from "@/lib/brand";

export const bulletSchema = z.object({
  icon: z.string().optional(),
  text: z.string(),
});

export const screenSpecSchema = z.object({
  template: z.enum(TEMPLATE_IDS as [string, ...string[]]),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  screenshot: z.string().nullable().optional(),
  screenshot2: z.string().nullable().optional(),
  bullets: z.array(bulletSchema).max(4).optional(),
  titleScale: z.number().min(0.3).max(3).optional(),
  phoneScale: z.number().min(0.3).max(3).optional(),
  phoneOffsetY: z.number().min(-1).max(1).optional(),
});

export const generateSchema = z.object({
  locale: z.string().min(2).max(10),
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
});

export type GenerateBody = z.infer<typeof generateSchema>;
