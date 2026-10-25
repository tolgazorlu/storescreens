import { bezelFor } from "@/lib/bezels";
import type { Device } from "./devices";
import type { Scene, Layer, Background, TextLayer } from "./scene";
import { uid } from "./scene";
import { DEFAULT_FONT } from "./fonts";
import { DEFAULT_BRAND, type Brand } from "./brand";

export type TemplateId =
  | "hero"
  | "hero-bleed"
  | "title-top"
  | "caption-bottom"
  | "split"
  | "feature-list"
  | "two-phones"
  | "duo"
  | "pair"
  | "creative"
  | "plain"
  | "text-only";

export const TEMPLATE_IDS: TemplateId[] = [
  "hero",
  "hero-bleed",
  "title-top",
  "caption-bottom",
  "split",
  "feature-list",
  "two-phones",
  "duo",
  "pair",
  "creative",
  "plain",
  "text-only",
];

export const TEMPLATE_LABELS: Record<TemplateId, string> = {
  hero: "Hero: big title, tilted phone",
  "hero-bleed": "Hero bleed: title, phone off the bottom",
  "title-top": "Title on top, phone below",
  "caption-bottom": "Phone on top, caption below",
  split: "Title left, phone right (cropped)",
  "feature-list": "Title + 3 bullet rows, phone below",
  "two-phones": "Two phones, one tilted",
  duo: "Two phones side by side, one tilted",
  pair: "Two iPhones, wide canvas",
  creative: "Creative asset: title, hero, side images",
  plain: "Phone only",
  "text-only": "Text only (no mockup)",
};

export type Bullet = { icon?: string; text: string };

/**
 * Per-screen inputs. Brand supplies colors/fonts/defaults; the knobs here
 * override brand defaults for this one screen.
 */
export type TemplateParams = {
  title?: string;
  subtitle?: string;
  screenshot?: string | null;
  /** Second screenshot for two-phones. */
  screenshot2?: string | null;
  /** Third image (creative template: right side). */
  screenshot3?: string | null;
  /** width/height of screenshot, lets layouts place neighbours next to its real edges. */
  screenshotAspect?: number;
  logo?: string | null;
  bullets?: Bullet[];
  brand?: Partial<Brand>;
  /** Legacy single-value overrides; prefer brand. */
  background?: Background;
  textColor?: string;
  fontFamily?: string;
  /** Multiplier on the template's title size. */
  titleScale?: number;
  /** Multiplier on the template's phone width. */
  phoneScale?: number;
  /** Shift the phone vertically, as a fraction of canvas height (+ = down). */
  phoneOffsetY?: number;
};

/** Phone aspect (frame outer) used across templates. */
const PHONE_ASPECT = 2.05;

export function buildScene(
  device: Device,
  template: TemplateId,
  p: TemplateParams,
): Scene {
  const brand: Brand = {
    ...DEFAULT_BRAND,
    ...(p.brand ?? {}),
    ...(p.background ? { background: p.background } : {}),
    ...(p.textColor ? { textColor: p.textColor } : {}),
    ...(p.fontFamily ? { fontFamily: p.fontFamily } : {}),
  };
  const titleScale = p.titleScale ?? brand.titleScale;
  const phoneScale = p.phoneScale ?? brand.phoneScale;
  const phoneOffsetY = p.phoneOffsetY ?? brand.phoneOffsetY;

  const W = device.width;
  const H = device.height;
  const pad = Math.round(W * 0.07);
  const titleSize = Math.round(W * 0.085 * titleScale);
  const subSize = Math.round(W * 0.038);
  const layers: Layer[] = [];
  const isTablet = device.frame === "ipad";
  const isDuo = device.frame === "duo-outer" || device.frame === "duo-inner";
  const bz = bezelFor(device.frame);
  const mockAspect = bz
    ? bz.height / bz.width
    : isTablet
      ? 1.36
      : isDuo
        ? device.height / device.width
        : PHONE_ASPECT;
  const dy = Math.round(H * phoneOffsetY);

  const text = (
    text: string,
    opts: Partial<TextLayer> & {
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
    fontWeight: brand.titleWeight,
    color: brand.textColor,
    align: "left",
    lineHeight: 1.1,
    letterSpacing: Math.round(-opts.fontSize * 0.02),
    dir: "auto",
    fontFamily: brand.fontFamily ?? DEFAULT_FONT,
    fit: "shrink",
    minFontSize: Math.round(W * 0.03),
    textTransform: brand.titleCase,
    highlightPill: false,
    rotation: 0,
    opacity: 1,
    locked: false,
    ...opts,
    x: Math.round(opts.x),
    y: Math.round(opts.y),
    w: Math.round(opts.w),
    h: Math.round(opts.h),
  });
  const sub = (
    t: string,
    x: number,
    y: number,
    w: number,
    align: TextLayer["align"] = "left",
  ): Layer =>
    text(t, {
      x,
      y,
      w,
      h: subSize * 3,
      fontSize: subSize,
      fontWeight: 500,
      lineHeight: 1.3,
      align,
      color: brand.accent,
      textTransform: "none",
      letterSpacing: 0,
    });

  const mockup = (
    x: number,
    y: number,
    w: number,
    rotation = 0,
    src = p.screenshot,
  ): Layer => {
    const sw = Math.round(w * phoneScale);
    return {
      id: uid("m"),
      type: "mockup",
      frame: device.frame,
      src: src ?? null,
      frameColor: brand.frameColor,
      shadow: true,
      x: Math.round(x - (sw - w) / 2),
      y: Math.round(y + dy),
      w: sw,
      h: Math.round(sw * mockAspect),
      rotation,
      opacity: 1,
      locked: false,
    };
  };

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
  const titleH = titleSize * 2.6;
  const title = (
    align: TextLayer["align"] = "left",
    y = titleY,
    size = titleSize,
  ) =>
    text(p.title ?? "Headline", {
      x: pad,
      y,
      w: W - pad * 2,
      h: size * 2.6,
      fontSize: size,
      align,
    });

  switch (template) {
    case "hero": {
      layers.push(title());
      if (p.subtitle)
        layers.push(sub(p.subtitle, pad, titleY + titleH, W - pad * 2));
      layers.push(
        mockup(
          Math.round(W * 0.12),
          Math.round(H * 0.42),
          Math.round(W * 0.86),
          -8,
        ),
      );
      break;
    }
    case "hero-bleed": {
      // Title top-centered, phone centered and running off the bottom edge.
      layers.push(title("center"));
      if (p.subtitle)
        layers.push(
          sub(p.subtitle, pad, titleY + titleH, W - pad * 2, "center"),
        );
      const mw = Math.round(W * 0.84);
      layers.push(mockup(Math.round((W - mw) / 2), Math.round(H * 0.335), mw));
      break;
    }
    case "title-top": {
      layers.push(title("center"));
      if (p.subtitle)
        layers.push(
          sub(p.subtitle, pad, titleY + titleH, W - pad * 2, "center"),
        );
      if (isTablet || isDuo) {
        // Non-phone aspect ratios (iPad, Duo outer/inner) are too short
        // relative to their width for the phone template's fixed
        // fractions: size the device by the space actually left under
        // the title so it never overflows the canvas.
        const headerBottom =
          titleY + titleH + Math.round(W * (p.subtitle ? 0.14 : 0.04));
        const bottomMargin = Math.round(H * 0.05);
        const availH = Math.max(
          Math.round(H * 0.3),
          H - headerBottom - bottomMargin,
        );
        const maxW = Math.round(W * 0.82);
        const mw = Math.min(maxW, Math.round(availH / mockAspect));
        layers.push(mockup(Math.round((W - mw) / 2), headerBottom, mw));
      } else {
        const mw = Math.round(W * 0.78);
        layers.push(
          mockup(Math.round((W - mw) / 2), Math.round(H * 0.34), mw),
        );
      }
      break;
    }
    case "caption-bottom": {
      const mw = Math.round(W * 0.74);
      const mh = Math.round(mw * mockAspect);
      layers.push(mockup(Math.round((W - mw) / 2), -Math.round(mh * 0.12), mw));
      const capY = Math.round(H * 0.72);
      const size = Math.round(titleSize * 0.8);
      layers.push(title("center", capY, size));
      if (p.subtitle)
        layers.push(
          sub(p.subtitle, pad, capY + size * 2.4, W - pad * 2, "center"),
        );
      break;
    }
    case "split": {
      layers.push(title());
      if (p.subtitle)
        layers.push(sub(p.subtitle, pad, titleY + titleH, W - pad * 2));
      layers.push(mockup(Math.round(W * 0.2), Math.round(H * 0.38), W));
      break;
    }
    case "feature-list": {
      layers.push(title());
      const bullets = (
        p.bullets?.length
          ? p.bullets
          : [
              { text: "First benefit" },
              { text: "Second benefit" },
              { text: "Third benefit" },
            ]
      ).slice(0, 4);
      const iconS = Math.round(W * 0.06);
      const rowH = Math.round(W * 0.095);
      const fallback = ["check", "zap", "star", "shield"];
      let y = titleY + titleH + Math.round(W * 0.02);
      bullets.forEach((b, i) => {
        layers.push({
          id: uid("i"),
          type: "icon",
          icon: b.icon ?? fallback[i % fallback.length],
          color: brand.accent,
          strokeWidth: 2.2,
          x: pad,
          y: y + Math.round((rowH - iconS) / 2),
          w: iconS,
          h: iconS,
          rotation: 0,
          opacity: 1,
          locked: false,
        });
        layers.push(
          text(b.text, {
            x: pad + iconS + Math.round(W * 0.03),
            y,
            w: W - pad * 2 - iconS - Math.round(W * 0.03),
            h: rowH,
            fontSize: Math.round(W * 0.042),
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: 0,
            textTransform: "none",
          }),
        );
        y += rowH;
      });
      const mw = Math.round(W * 0.78);
      layers.push(
        mockup(
          Math.round((W - mw) / 2),
          Math.max(y + Math.round(W * 0.05), Math.round(H * 0.46)),
          mw,
        ),
      );
      break;
    }
    case "two-phones": {
      layers.push(title("center"));
      if (p.subtitle)
        layers.push(
          sub(p.subtitle, pad, titleY + titleH, W - pad * 2, "center"),
        );
      const mw = Math.round(W * 0.6);
      layers.push(
        mockup(
          Math.round(W * 0.42),
          Math.round(H * 0.4),
          mw,
          8,
          p.screenshot2 ?? p.screenshot,
        ),
      );
      layers.push(mockup(Math.round(W * 0.02), Math.round(H * 0.46), mw, -6));
      break;
    }
    case "duo": {
      // Two upright phones side by side: a larger one in front (raised,
      // overlapping to the right) and a smaller one behind (lower, to the
      // left). Fractions of H keep both fully on-canvas across aspect
      // ratios (iPhone ~2.05, iPad ~1.36).
      layers.push(title("center"));
      if (p.subtitle)
        layers.push(
          sub(p.subtitle, pad, titleY + titleH, W - pad * 2, "center"),
        );
      const mwBack = Math.round(W * 0.5);
      const mwFront = Math.round(W * 0.62);
      const backX = Math.round(W * 0.08);
      const backY = Math.round(H * 0.4);
      const frontX = Math.round(W - mwFront - W * 0.06);
      const frontY = Math.round(H * 0.32);
      layers.push(mockup(backX, backY, mwBack, -4, p.screenshot));
      layers.push(
        mockup(frontX, frontY, mwFront, 4, p.screenshot2 ?? p.screenshot),
      );
      break;
    }
    case "pair": {
      // Wide canvases (iPad, iPhone Duo) for an iPhone-only app: two iPhone
      // frames side by side so the screenshots keep their real aspect and the
      // canvas has no empty side bands or letterboxing.
      layers.push(title("center"));
      const subH = p.subtitle ? subSize * 3 : 0;
      if (p.subtitle)
        layers.push(
          sub(p.subtitle, pad, titleY + titleH, W - pad * 2, "center"),
        );
      const top = titleY + titleH + subH + Math.round(H * 0.025);
      const gap = Math.round(W * 0.045);
      const availH = H - top - Math.round(H * 0.035);
      const mw = Math.min(
        Math.floor((W - pad * 1.2 - gap) / 2),
        Math.floor(availH / PHONE_ASPECT),
      );
      const mh = Math.round(mw * PHONE_ASPECT);
      const x0 = Math.round((W - (mw * 2 + gap)) / 2);
      const y0 = Math.round(top + (availH - mh) / 2);
      const phone = (x: number, src: string | null | undefined): Layer => ({
        id: uid("m"),
        type: "mockup",
        frame: "iphone",
        src: src ?? null,
        frameColor: brand.frameColor,
        shadow: true,
        x,
        y: y0,
        w: mw,
        h: mh,
        rotation: 0,
        opacity: 1,
        locked: false,
      });
      layers.push(phone(x0, p.screenshot));
      layers.push(phone(x0 + mw + gap, p.screenshot2 ?? p.screenshot));
      break;
    }
    case "creative": {
      // App Store creative asset (header / search / universal). Title + hero
      // stay inside Apple's Art Safe Area; side images (screenshot2/3) sit at
      // the hero's height just outside it and may be cropped on narrow
      // devices, so they must be decorative, not essential.
      const sa = device.safeArea ?? {
        x: Math.round(W * 0.2),
        y: Math.round(H * 0.2),
        w: Math.round(W * 0.6),
        h: Math.round(H * 0.6),
      };
      const tSize = Math.round(sa.h * 0.135 * titleScale);
      const tH = Math.round(tSize * 1.3);
      layers.push(
        text(p.title ?? "Headline", {
          x: sa.x,
          y: sa.y,
          w: sa.w,
          h: tH,
          fontSize: tSize,
          align: "center",
          lineHeight: 1.1,
          minFontSize: Math.round(tSize * 0.6),
        }),
      );
      const heroY = sa.y + tH + Math.round(sa.h * 0.06);
      const heroH = sa.y + sa.h - heroY;
      const img = (
        src: string | null | undefined,
        x: number,
        y: number,
        w: number,
        h: number,
      ): Layer => ({
        id: uid("i"),
        type: "image",
        src: src ?? "",
        fit: "contain",
        radius: 0,
        x: Math.round(x),
        y: Math.round(y),
        w: Math.round(w),
        h: Math.round(h),
        rotation: 0,
        opacity: 1,
        locked: false,
      });
      if (p.screenshot) layers.push(img(p.screenshot, sa.x, heroY, sa.w, heroH));
      // Side boxes: same height as the hero, square-ish (widgets, icons).
      const heroW = Math.min(
        sa.w,
        p.screenshotAspect ? heroH * p.screenshotAspect : sa.w,
      );
      const heroL = sa.x + (sa.w - heroW) / 2;
      const gap = Math.round(heroH * 0.12);
      const sideW = Math.min(heroH, heroL - gap - Math.round(W * 0.02));
      if (p.screenshot2 && sideW > 0)
        layers.push(img(p.screenshot2, heroL - gap - sideW, heroY, sideW, heroH));
      if (p.screenshot3 && sideW > 0)
        layers.push(img(p.screenshot3, heroL + heroW + gap, heroY, sideW, heroH));
      break;
    }
    case "plain": {
      const mw = Math.round(W * 0.8);
      layers.push(mockup(Math.round((W - mw) / 2), Math.round(H * 0.08), mw));
      break;
    }
    case "text-only": {
      const y = Math.round(H * 0.38);
      layers.push(title("center", y, Math.round(titleSize * 1.1)));
      if (p.subtitle)
        layers.push(
          sub(p.subtitle, pad, y + titleSize * 2.9, W - pad * 2, "center"),
        );
      break;
    }
  }

  return { width: W, height: H, background: brand.background, layers };
}
