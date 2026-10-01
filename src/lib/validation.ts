import { z } from "zod";
import { DEVICE_IDS } from "@/lib/devices";
import { TEMPLATE_IDS } from "@/lib/templates";
import { backgroundSchema } from "@/lib/scene";

export const screenSpecSchema = z.object({
  template: z.enum(TEMPLATE_IDS as [string, ...string[]]),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  screenshot: z.string().nullable().optional(),
});

export const generateSchema = z.object({
  locale: z.string().min(2).max(10),
  device: z.enum(DEVICE_IDS as [string, ...string[]]),
  logo: z.string().nullable().optional(),
  background: backgroundSchema.optional(),
  textColor: z.string().optional(),
  fontFamily: z.string().optional(),
  replace: z.boolean().optional(),
  screens: z.array(screenSpecSchema).min(1).max(10),
});
