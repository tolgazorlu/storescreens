import type { CSSProperties } from "react";
import type { Scene, Layer, MockupLayer, TextLayer } from "@/lib/scene";
import { backgroundCss } from "@/lib/scene";
import { layoutParagraph, detectDir, hasRtl, type Word } from "@/lib/bidi";
import { fontStack } from "@/lib/fonts";

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
        background: backgroundCss(scene.background),
        fontFamily: FONT_FAMILY,
      }}
    >
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
  const base = layer.dir === "auto" ? detectDir(layer.text) : layer.dir;
  const simple = base === "ltr" && !hasRtl(layer.text);
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
        {layer.text}
      </div>
    );
  }
  return (
    <BidiText
      text={layer.text}
      base={base}
      justify={justify}
      font={font}
      block={block}
    />
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

function MockupView({
  layer,
  resolveSrc,
}: {
  layer: MockupLayer;
  resolveSrc: (s: string) => string;
}) {
  const w = layer.w;
  const h = layer.h;
  const isTablet = layer.frame === "ipad";
  const bezel = Math.round(w * (isTablet ? 0.045 : 0.032));
  const outerRadius = Math.round(w * (isTablet ? 0.07 : 0.165));
  const innerRadius = Math.max(0, outerRadius - bezel);
  const screenW = w - bezel * 2;
  const screenH = h - bezel * 2;
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
            overflow: "hidden",
            borderRadius: innerRadius,
            background: "#e5e5e5",
          }}
        >
          {layer.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveSrc(layer.src)}
              alt=""
              width={screenW}
              height={screenH}
              style={{ width: screenW, height: screenH, objectFit: "cover" }}
            />
          ) : (
            <Placeholder w={screenW} h={screenH} />
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
