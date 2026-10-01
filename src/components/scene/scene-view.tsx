import type { CSSProperties } from "react";
import type { Scene, Layer, MockupLayer, TextLayer } from "@/lib/scene";
import { backgroundCss } from "@/lib/scene";

/**
 * Pure renderer shared by the editor (DOM) and the exporter (satori).
 * Rules: inline styles only, every multi-child div is display:flex,
 * no CSS classes, no external stylesheets.
 */

export const FONT_FAMILY = "Inter, Noto Sans Arabic";

export function SceneView({
  scene,
  resolveSrc = (s) => s,
}: {
  scene: Scene;
  resolveSrc?: (src: string) => string;
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
        <LayerView key={layer.id} layer={layer} resolveSrc={resolveSrc} />
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
}: {
  layer: Layer;
  resolveSrc: (s: string) => string;
}) {
  switch (layer.type) {
    case "text":
      return <TextView layer={layer} />;
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

const RTL_RE = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

function TextView({ layer }: { layer: TextLayer }) {
  // Arabic/Hebrew text needs an explicit direction or satori shapes it
  // left-to-right and the line order comes out mirrored.
  const dir = RTL_RE.test(layer.text) ? "rtl" : "ltr";
  // satori reorders words around ordinary spaces in RTL runs; non-breaking
  // spaces keep each line as one run. Explicit newlines still break lines.
  const text = dir === "rtl" ? layer.text.replace(/ /g, "\u00a0") : layer.text;
  const justify =
    layer.align === "center"
      ? "center"
      : layer.align === "right"
        ? "flex-end"
        : "flex-start";
  return (
    <div style={{ ...layerBox(layer), justifyContent: justify }}>
      <div
        style={{
          display: "flex",
          fontSize: layer.fontSize,
          fontWeight: layer.fontWeight,
          color: layer.color,
          lineHeight: layer.lineHeight,
          letterSpacing: layer.letterSpacing,
          textAlign: layer.align,
          direction: dir,
          whiteSpace: "pre-wrap",
          width: "100%",
          justifyContent: justify,
          wordBreak: "break-word",
        }}
      >
        {text}
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
