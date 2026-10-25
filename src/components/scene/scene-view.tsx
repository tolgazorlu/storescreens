import { bezelFor, type Bezel } from "@/lib/bezels";
import type { CSSProperties } from "react";
import type { Scene, Layer, MockupLayer, TextLayer } from "@/lib/scene";
import { bgRect } from "@/lib/scene";
import { backgroundSvgDataUrl, backgroundOverlaySvgDataUrl, rasterBackgroundSrc } from "@/lib/background";
import { layoutParagraph, detectDir, hasRtl, type Word } from "@/lib/bidi";
import { fontStack } from "@/lib/fonts";
import { iconDataUri } from "@/lib/icons";

/**
 * Pure renderer shared by the editor (DOM) and the exporter (satori).
 * Rules: inline styles only, every multi-child div is display:flex,
 * no CSS classes, no external stylesheets.
 */

export const FONT_FAMILY = "Inter";
/** Layer id -> fitted font size (see lib/fit.ts). */
export type Fitted = Record<string, number>;

export function SceneView({
  scene,
  resolveSrc = (s) => s,
  fitted,
}: {
  scene: Scene;
  resolveSrc?: (src: string) => string;
  fitted?: Fitted;
}) {
  return (
    <div
      style={{
        width: scene.width,
        height: scene.height,
        display: "flex",
        position: "relative",
        overflow: "hidden",
        fontFamily: FONT_FAMILY,
      }}
    >
      <BackgroundLayer scene={scene} resolveSrc={resolveSrc} />
      {scene.layers.map((layer) => (
        <LayerView
          key={layer.id}
          layer={layer}
          resolveSrc={resolveSrc}
          fontSize={fitted?.[layer.id]}
        />
      ))}
    </div>
  );
}

/**
 * Background for one tile, shared by the exporter (satori) and the editor canvas (DOM): both
 * just load the same baked SVG image. A panorama's `bg` rect is wider than the tile and offset,
 * so the pattern lines up across the seam instead of each tile drawing its own copy.
 */
export function BackgroundLayer({
  scene,
  resolveSrc = (s) => s,
}: {
  scene: Scene;
  resolveSrc?: (src: string) => string;
}) {
  const rect = bgRect(scene);
  const raster = rasterBackgroundSrc(scene.background);
  const box = { position: "absolute" as const, left: rect.offsetX, top: 0, width: rect.width, height: rect.height };
  if (raster) {
    // resvg can't decode an <image> whose href is itself an SVG containing a raster image, so
    // this bypasses backgroundSvgDataUrl's flattened-SVG approach and draws the raster directly.
    const hasOverlay = (scene.background.glow?.length ?? 0) > 0 || !!scene.background.texture;
    return (
      <div style={{ ...box, display: "flex" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolveSrc(raster)}
          alt=""
          width={rect.width}
          height={rect.height}
          style={{ position: "absolute", left: 0, top: 0, width: rect.width, height: rect.height, objectFit: "cover" }}
        />
        {hasOverlay && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backgroundOverlaySvgDataUrl(scene.background, rect.width, rect.height)}
            alt=""
            width={rect.width}
            height={rect.height}
            style={{ position: "absolute", left: 0, top: 0, width: rect.width, height: rect.height }}
          />
        )}
      </div>
    );
  }
  const url = backgroundSvgDataUrl(scene.background, rect.width, rect.height, resolveSrc);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" width={rect.width} height={rect.height} style={box} />
  );
}

function layerBox(layer: Layer): CSSProperties {
  const box: CSSProperties = {
    position: "absolute",
    left: layer.x,
    top: layer.y,
    width: layer.w,
    height: layer.h,
    display: "flex",
    opacity: layer.opacity,
  };
  if (layer.rotation) {
    box.transform = `rotate(${layer.rotation}deg)`;
    box.transformOrigin = "center";
  }
  return box;
}

export function LayerView({
  layer,
  resolveSrc,
  fontSize,
}: {
  layer: Layer;
  resolveSrc: (s: string) => string;
  fontSize?: number;
}) {
  switch (layer.type) {
    case "text":
      return <TextView layer={layer} fontSize={fontSize} />;
    case "rect":
      return (
        <div
          style={{
            ...layerBox(layer),
            background: layer.color,
            borderRadius: layer.radius,
          }}
        />
      );
    case "image":
      return (
        <div
          style={{
            ...layerBox(layer),
            overflow: "hidden",
            borderRadius: layer.radius,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveSrc(layer.src)}
            alt=""
            width={layer.w}
            height={layer.h}
            style={{ width: layer.w, height: layer.h, objectFit: layer.fit }}
          />
        </div>
      );
    case "mockup":
      return <MockupView layer={layer} resolveSrc={resolveSrc} />;
    case "icon":
      return (
        <div style={layerBox(layer)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={iconDataUri(layer.icon, layer.color, layer.strokeWidth)}
            alt=""
            width={layer.w}
            height={layer.h}
            style={{ width: layer.w, height: layer.h }}
          />
        </div>
      );
  }
}

function TextView({
  layer,
  fontSize,
}: {
  layer: TextLayer;
  fontSize?: number;
}) {
  const justify =
    layer.align === "center"
      ? "center"
      : layer.align === "right"
        ? "flex-end"
        : "flex-start";
  return (
    <div style={{ ...layerBox(layer), justifyContent: justify }}>
      <TextContent layer={layer} fontSize={fontSize ?? layer.fontSize} />
    </div>
  );
}

/**
 * The text block itself, without the absolute box, so it can be measured:
 * render it into a probe of the layer's width and read the height. Both the
 * server (satori probe) and the editor (DOM probe) use this same component.
 */
export function TextContent({
  layer,
  fontSize = layer.fontSize,
  block = true,
}: {
  layer: TextLayer;
  fontSize?: number;
  /** false: shrink-to-content, no wrapping (used to measure the widest word). */
  block?: boolean;
}) {
  const justify =
    layer.align === "center"
      ? "center"
      : layer.align === "right"
        ? "flex-end"
        : "flex-start";
  const text =
    layer.textTransform === "uppercase"
      ? layer.text.toLocaleUpperCase()
      : layer.text;
  const base = layer.dir === "auto" ? detectDir(text) : layer.dir;
  const simple = base === "ltr" && !hasRtl(text);
  const k = fontSize / layer.fontSize;
  const font: CSSProperties = {
    fontFamily: fontStack(layer.fontFamily),
    fontSize,
    fontWeight: layer.fontWeight,
    color: layer.color,
    lineHeight: layer.lineHeight,
    letterSpacing: Math.round(layer.letterSpacing * k),
  };
  if (simple) {
    if (layer.highlightColor && /\*[^*]+\*/.test(text)) {
      return (
        <HighlightText
          text={text}
          font={font}
          justify={justify}
          block={block}
          color={layer.highlightColor}
          pill={layer.highlightPill}
        />
      );
    }
    return (
      <div
        style={{
          ...font,
          display: "flex",
          textAlign: layer.align,
          whiteSpace: block ? "pre-wrap" : "pre",
          width: block ? "100%" : "auto",
          justifyContent: justify,
          wordBreak: "normal",
        }}
      >
        {text}
      </div>
    );
  }
  return (
    <BidiText
      // `*word*` highlight markers are only supported on the simple (non-RTL) path.
      text={text.replace(/\*([^*]+)\*/g, "$1")}
      base={base}
      justify={justify}
      font={font}
      block={block}
    />
  );
}

/** Black or white, whichever reads better on `hex`. */
function contrastColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#111111";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111111" : "#ffffff";
}

/**
 * `*word*` in a title renders that word (or phrase) in an accent color, optionally on a
 * highlighter pill. Scoped to the simple (non-RTL) text path; word matching is by text, not
 * position, so a repeated word highlights every instance (acceptable for short headlines).
 */
function HighlightText({
  text,
  font,
  justify,
  block,
  color,
  pill,
}: {
  text: string;
  font: CSSProperties;
  justify: string;
  block: boolean;
  color: string;
  pill: boolean;
}) {
  const highlighted = new Set<string>();
  const clean = text.replace(/\*([^*]+)\*/g, (_, inner: string) => {
    for (const w of inner.split(/\s+/)) if (w) highlighted.add(w);
    return inner;
  });
  const pad = typeof font.fontSize === "number" ? Math.round(font.fontSize * 0.08) : 0;
  return (
    <div
      style={{
        ...font,
        display: "flex",
        flexWrap: block ? "wrap" : "nowrap",
        alignItems: "center",
        textAlign: "left",
        width: block ? "100%" : "auto",
        justifyContent: justify,
        rowGap: pad,
      }}
    >
      {clean.split(/(\s+)/).map((piece, i) => {
        if (!piece) return null;
        if (/^\s+$/.test(piece)) return <span key={i} style={{ whiteSpace: "pre" }}>{piece}</span>;
        const hl = highlighted.has(piece);
        if (!hl) return <span key={i} style={{ whiteSpace: "pre" }}>{piece}</span>;
        return (
          <span
            key={i}
            style={
              pill
                ? {
                    display: "flex",
                    whiteSpace: "pre",
                    color: contrastColor(color),
                    background: color,
                    borderRadius: pad * 2,
                    padding: `0 ${pad}px`,
                  }
                : { color, whiteSpace: "pre" }
            }
          >
            {piece}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Bidirectional text. Paragraph = wrapping flex row (`row-reverse` for an
 * RTL base). Each run of the opposite direction is one nested no-wrap row in
 * its own order. See `layoutParagraph` for why ordering is done with flex.
 */
function BidiText({
  text,
  base,
  justify,
  font,
  block = true,
}: {
  text: string;
  base: "ltr" | "rtl";
  justify: string;
  font: CSSProperties;
  block?: boolean;
}) {
  const rowDir = (d: "ltr" | "rtl") => (d === "rtl" ? "row-reverse" : "row");
  // justifyContent is relative to flex-start, which row-reverse flips.
  const j =
    base === "rtl"
      ? justify === "flex-start"
        ? "flex-end"
        : justify === "flex-end"
          ? "flex-start"
          : justify
      : justify;
  const span = (key: string, t: string) => (
    <span key={key} style={{ ...font, whiteSpace: "pre" }}>
      {t}
    </span>
  );
  const word = (key: string, w: Word, dir: "ltr" | "rtl") =>
    "space" in w ? (
      span(key, w.space)
    ) : w.tokens.length === 1 ? (
      span(key, w.tokens[0])
    ) : (
      <span
        key={key}
        style={{
          ...font,
          display: "flex",
          flexDirection: rowDir(dir),
          whiteSpace: "pre",
        }}
      >
        {w.tokens.map((t, i) => span(String(i), t))}
      </span>
    );
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: block ? "100%" : "auto",
      }}
    >
      {text.split("\n").map((para, pi) => {
        const laid = layoutParagraph(para, base);
        return (
          <div
            key={pi}
            style={{
              display: "flex",
              flexDirection: rowDir(base),
              flexWrap: block ? "wrap" : "nowrap",
              justifyContent: j,
              width: "100%",
            }}
          >
            {laid.runs.flatMap((run, ri) => {
              if (run.dir === base)
                return run.words.map((w, wi) =>
                  word(`${ri}-${wi}`, w, run.dir),
                );
              // Opposite-direction run: its own row, but leading/trailing
              // spaces belong to the outer flow so wrapping can happen there.
              const ws = [...run.words];
              const lead =
                ws[0] && "space" in ws[0]
                  ? (ws.shift() as { space: string })
                  : null;
              const trail =
                ws.length && "space" in ws[ws.length - 1]
                  ? (ws.pop() as { space: string })
                  : null;
              const nodes = [];
              if (lead) nodes.push(span(`${ri}-lead`, lead.space));
              nodes.push(
                <span
                  key={ri}
                  style={{
                    ...font,
                    display: "flex",
                    flexDirection: rowDir(run.dir),
                    whiteSpace: "pre",
                  }}
                >
                  {ws.map((w, wi) => word(String(wi), w, run.dir))}
                </span>,
              );
              if (trail) nodes.push(span(`${ri}-trail`, trail.space));
              return nodes;
            })}
          </div>
        );
      })}
    </div>
  );
}

function darken(hex: string, factor: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 0xff) * factor);
  const g = Math.round(((n >> 8) & 0xff) * factor);
  const b = Math.round((n & 0xff) * factor);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Official Apple bezel PNG over the screenshot, which fills the screen hole. */
function BezelMockup({
  layer,
  bezel,
  resolveSrc,
}: {
  layer: MockupLayer;
  bezel: Bezel;
  resolveSrc: (s: string) => string;
}) {
  const sx = layer.w / bezel.width;
  const sy = layer.h / bezel.height;
  const hx = Math.round(bezel.hole.x * sx);
  const hy = Math.round(bezel.hole.y * sy);
  const hw = Math.round(bezel.hole.w * sx);
  const hh = Math.round(bezel.hole.h * sy);
  const fit = layer.screenFit === "contain" ? "contain" : "cover";
  return (
    <div style={{ ...layerBox(layer) }}>
      <div
        style={{
          width: layer.w,
          height: layer.h,
          display: "flex",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: hx,
            top: hy,
            width: hw,
            height: hh,
            display: "flex",
            background: "#000000",
            // No overflow:hidden: satori renders a rotated, partly off-canvas clipped hole as a black wedge; the img rounds itself.
            borderRadius: Math.round((bezel.radius ?? 0) * sx),
          }}
        >
          {layer.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveSrc(layer.src)}
              alt=""
              width={hw}
              height={hh}
              style={{
                width: hw,
                height: hh,
                objectFit: fit,
                objectPosition: "top",
                borderRadius: Math.round((bezel.radius ?? 0) * sx),
              }}
            />
          ) : (
            <Placeholder w={hw} h={hh} />
          )}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolveSrc(bezel.file)}
          alt=""
          width={layer.w}
          height={layer.h}
          style={{ position: "absolute", left: 0, top: 0, width: layer.w, height: layer.h }}
        />
      </div>
    </div>
  );
}

function MockupView({
  layer,
  resolveSrc,
}: {
  layer: MockupLayer;
  resolveSrc: (s: string) => string;
}) {
  const w = layer.w;
  const h = layer.h;
  const bezel_ = bezelFor(layer.frame);
  if (bezel_) return <BezelMockup layer={layer} bezel={bezel_} resolveSrc={resolveSrc} />;
  const isTablet = layer.frame === "ipad";
  const isDuoOuter = layer.frame === "duo-outer";
  const isDuoInner = layer.frame === "duo-inner";
  // iPad Pro: thin uniform bezel, large corner radius, no home button.
  // Duo outer: compact cover display, thin bezel, big radius, pill camera.
  // Duo inner: unfolded panel, very thin even bezel, faint fold crease.
  const bezel = Math.round(
    w * (isTablet ? 0.022 : isDuoOuter ? 0.035 : isDuoInner ? 0.02 : 0.032),
  );
  const outerRadius = Math.round(
    w * (isTablet ? 0.09 : isDuoOuter ? 0.12 : isDuoInner ? 0.1 : 0.165),
  );
  const innerRadius = Math.max(0, outerRadius - bezel);
  const screenW = w - bezel * 2;
  const screenH = h - bezel * 2;
  // No real in-app screenshot exists at the Duo's (or an unsupported iPad)
  // aspect ratio: show the iPhone-shaped capture at its own aspect,
  // letterboxed, instead of cropping it with cover.
  const fitMode = layer.screenFit ?? "auto";
  const letterbox =
    fitMode === "contain" ||
    (fitMode === "auto" && (isTablet || isDuoOuter || isDuoInner));
  const frameStyle: CSSProperties = {
    width: w,
    height: h,
    display: "flex",
    position: "relative",
    background: layer.frameColor,
    borderRadius: outerRadius,
  };
  if (layer.shadow)
    frameStyle.boxShadow = `0 ${Math.round(w * 0.04)}px ${Math.round(w * 0.05)}px rgba(0,0,0,0.35)`;
  if (isTablet || isDuoOuter || isDuoInner)
    // Subtle edge highlight so the flat aluminum bezel reads as a frame,
    // not a flat color block.
    frameStyle.boxShadow = [
      frameStyle.boxShadow,
      "inset 0 0 0 1px rgba(255,255,255,0.12)",
    ]
      .filter(Boolean)
      .join(", ");

  return (
    <div style={{ ...layerBox(layer) }}>
      <div style={frameStyle}>
        <div
          style={{
            position: "absolute",
            left: bezel,
            top: bezel,
            width: screenW,
            height: screenH,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: innerRadius,
            background: letterbox ? darken(layer.frameColor, 0.75) : "#e5e5e5",
          }}
        >
          {layer.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveSrc(layer.src)}
              alt=""
              width={screenW}
              height={screenH}
              style={{
                width: screenW,
                height: screenH,
                objectFit: letterbox ? "contain" : "cover",
              }}
            />
          ) : (
            <Placeholder w={screenW} h={screenH} />
          )}
          {isDuoInner && (
            // Faint vertical fold crease down the middle of the unfolded panel.
            <div
              style={{
                position: "absolute",
                left: Math.round(screenW / 2 - screenW * 0.004),
                top: 0,
                width: Math.round(screenW * 0.008),
                height: screenH,
                display: "flex",
                background:
                  "linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,0.18), rgba(0,0,0,0))",
              }}
            />
          )}
        </div>
        {layer.frame === "iphone" && (
          <div
            style={{
              position: "absolute",
              left: Math.round((w - w * 0.3) / 2),
              top: bezel + Math.round(w * 0.028),
              width: Math.round(w * 0.3),
              height: Math.round(w * 0.085),
              display: "flex",
              background: "#000",
              borderRadius: Math.round(w * 0.05),
            }}
          />
        )}
        {layer.frame === "ipad" && (
          <div
            style={{
              position: "absolute",
              left: Math.round((w - w * 0.016) / 2),
              top: Math.round(bezel / 2 - w * 0.008),
              width: Math.round(w * 0.016),
              height: Math.round(w * 0.016),
              display: "flex",
              background: "#000",
              borderRadius: Math.round(w * 0.016),
            }}
          />
        )}
        {isDuoOuter && (
          <div
            style={{
              position: "absolute",
              left: Math.round((w - w * 0.16) / 2),
              top: Math.round(bezel / 2 - w * 0.022),
              width: Math.round(w * 0.16),
              height: Math.round(w * 0.044),
              display: "flex",
              background: "#000",
              borderRadius: Math.round(w * 0.022),
            }}
          />
        )}
        {isDuoInner && (
          <div
            style={{
              position: "absolute",
              left: Math.round((w - w * 0.014) / 2),
              top: Math.round(bezel / 2 - w * 0.007),
              width: Math.round(w * 0.014),
              height: Math.round(w * 0.014),
              display: "flex",
              background: "#000",
              borderRadius: Math.round(w * 0.014),
            }}
          />
        )}
        {layer.frame === "android" && (
          <div
            style={{
              position: "absolute",
              left: Math.round((w - w * 0.06) / 2),
              top: bezel + Math.round(w * 0.025),
              width: Math.round(w * 0.06),
              height: Math.round(w * 0.06),
              display: "flex",
              background: "#000",
              borderRadius: Math.round(w * 0.03),
            }}
          />
        )}
      </div>
    </div>
  );
}

function Placeholder({ w, h }: { w: number; h: number }) {
  const s = Math.round(w * 0.22);
  return (
    <div
      style={{
        width: w,
        height: h,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: s,
          height: s,
          display: "flex",
          border: `${Math.max(2, Math.round(s * 0.06))}px solid #9a9a9a`,
          borderRadius: Math.round(s * 0.12),
        }}
      />
    </div>
  );
}
