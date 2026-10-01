import type { Device } from "./devices";
import type { Scene, Layer, Background } from "./scene";
import { uid } from "./scene";

export type TemplateId =
  "hero" | "title-top" | "caption-bottom" | "split" | "plain" | "text-only";

export const TEMPLATE_IDS: TemplateId[] = [
  "hero",
  "title-top",
  "caption-bottom",
  "split",
  "plain",
  "text-only",
];

export const TEMPLATE_LABELS: Record<TemplateId, string> = {
  hero: "Hero: big title, tilted phone",
  "title-top": "Title on top, phone below",
  "caption-bottom": "Phone on top, caption below",
  split: "Title left, phone right (cropped)",
  plain: "Phone only",
  "text-only": "Text only (no mockup)",
};

export type TemplateParams = {
  title?: string;
  subtitle?: string;
  screenshot?: string | null;
  logo?: string | null;
  background?: Background;
  textColor?: string;
};

const DEFAULT_BG: Background = { type: "solid", color: "#2E3DF2" };

/** Phone aspect (frame outer) used across templates. */
const PHONE_ASPECT = 2.05;

export function buildScene(
  device: Device,
  template: TemplateId,
  p: TemplateParams,
): Scene {
  const W = device.width;
  const H = device.height;
  const pad = Math.round(W * 0.07);
  const textColor = p.textColor ?? "#ffffff";
  const background = p.background ?? DEFAULT_BG;
  const titleSize = Math.round(W * 0.085);
  const subSize = Math.round(W * 0.038);
  const layers: Layer[] = [];
  const isTablet = device.frame === "ipad";
  const mockAspect = isTablet ? 1.36 : PHONE_ASPECT;

  const text = (
    text: string,
    opts: Partial<Extract<Layer, { type: "text" }>> & {
      x: number;
      y: number;
      w: number;
      h: number;
      fontSize: number;
    },
  ): Layer => ({
    id: uid("t"),
    type: "text",
    text,
    fontWeight: 700,
    color: textColor,
    align: "left",
    lineHeight: 1.1,
    letterSpacing: Math.round(-opts.fontSize * 0.02),
    rotation: 0,
    opacity: 1,
    locked: false,
    ...opts,
    x: Math.round(opts.x),
    y: Math.round(opts.y),
    w: Math.round(opts.w),
    h: Math.round(opts.h),
  });

  const mockup = (x: number, y: number, w: number, rotation = 0): Layer => ({
    id: uid("m"),
    type: "mockup",
    frame: device.frame,
    src: p.screenshot ?? null,
    frameColor: "#111111",
    shadow: true,
    x,
    y,
    w,
    h: Math.round(w * mockAspect),
    rotation,
    opacity: 1,
    locked: false,
  });

  if (p.logo) {
    const s = Math.round(W * 0.09);
    layers.push({
      id: uid("logo"),
      type: "image",
      src: p.logo,
      fit: "contain",
      radius: Math.round(s * 0.22),
      x: pad,
      y: pad,
      w: s,
      h: s,
      rotation: 0,
      opacity: 1,
      locked: false,
    });
  }

  const titleY = p.logo
    ? pad + Math.round(W * 0.09) + Math.round(W * 0.04)
    : pad;

  switch (template) {
    case "hero": {
      layers.push(
        text(p.title ?? "Headline", {
          x: pad,
          y: titleY,
          w: W - pad * 2,
          h: titleSize * 2.6,
          fontSize: titleSize,
        }),
      );
      if (p.subtitle)
        layers.push(
          text(p.subtitle, {
            x: pad,
            y: titleY + titleSize * 2.6,
            w: W - pad * 2,
            h: subSize * 3,
            fontSize: subSize,
            fontWeight: 500,
            lineHeight: 1.3,
          }),
        );
      const mw = Math.round(W * 0.86);
      layers.push(mockup(Math.round(W * 0.12), Math.round(H * 0.42), mw, -8));
      break;
    }
    case "title-top": {
      layers.push(
        text(p.title ?? "Headline", {
          x: pad,
          y: titleY,
          w: W - pad * 2,
          h: titleSize * 2.6,
          fontSize: titleSize,
          align: "center",
        }),
      );
      if (p.subtitle)
        layers.push(
          text(p.subtitle, {
            x: pad,
            y: titleY + titleSize * 2.6,
            w: W - pad * 2,
            h: subSize * 3,
            fontSize: subSize,
            fontWeight: 500,
            lineHeight: 1.3,
            align: "center",
          }),
        );
      const mw = Math.round(W * 0.78);
      layers.push(mockup(Math.round((W - mw) / 2), Math.round(H * 0.34), mw));
      break;
    }
    case "caption-bottom": {
      const mw = Math.round(W * 0.74);
      const mh = Math.round(mw * mockAspect);
      layers.push(mockup(Math.round((W - mw) / 2), -Math.round(mh * 0.12), mw));
      const capY = Math.round(H * 0.72);
      layers.push(
        text(p.title ?? "Caption", {
          x: pad,
          y: capY,
          w: W - pad * 2,
          h: titleSize * 2.4,
          fontSize: Math.round(titleSize * 0.8),
          align: "center",
        }),
      );
      if (p.subtitle)
        layers.push(
          text(p.subtitle, {
            x: pad,
            y: capY + titleSize * 1.9,
            w: W - pad * 2,
            h: subSize * 3,
            fontSize: subSize,
            fontWeight: 500,
            lineHeight: 1.3,
            align: "center",
          }),
        );
      break;
    }
    case "split": {
      layers.push(
        text(p.title ?? "Headline", {
          x: pad,
          y: titleY,
          w: W - pad * 2,
          h: titleSize * 2.6,
          fontSize: titleSize,
        }),
      );
      if (p.subtitle)
        layers.push(
          text(p.subtitle, {
            x: pad,
            y: titleY + titleSize * 2.6,
            w: W - pad * 2,
            h: subSize * 3,
            fontSize: subSize,
            fontWeight: 500,
            lineHeight: 1.3,
          }),
        );
      const mw = Math.round(W * 1.0);
      layers.push(mockup(Math.round(W * 0.2), Math.round(H * 0.38), mw));
      break;
    }
    case "plain": {
      const mw = Math.round(W * 0.8);
      layers.push(mockup(Math.round((W - mw) / 2), Math.round(H * 0.08), mw));
      break;
    }
    case "text-only": {
      layers.push(
        text(p.title ?? "Headline", {
          x: pad,
          y: Math.round(H * 0.38),
          w: W - pad * 2,
          h: titleSize * 2.6,
          fontSize: Math.round(titleSize * 1.1),
          align: "center",
        }),
      );
      if (p.subtitle)
        layers.push(
          text(p.subtitle, {
            x: pad,
            y: Math.round(H * 0.38) + titleSize * 2.9,
            w: W - pad * 2,
            h: subSize * 3,
            fontSize: subSize,
            fontWeight: 500,
            lineHeight: 1.3,
            align: "center",
          }),
        );
      break;
    }
  }

  return { width: W, height: H, background, layers };
}
