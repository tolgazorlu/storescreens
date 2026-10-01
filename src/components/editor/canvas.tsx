"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as RPE,
} from "react";
import type { Scene, Layer } from "@/lib/scene";
import { backgroundCss } from "@/lib/scene";
import { LayerView } from "@/components/scene/scene-view";

type Props = {
  scene: Scene;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<Layer>) => void;
};

type Drag = {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  orig: { x: number; y: number; w: number; h: number; fontSize?: number };
  corner?: string;
};

/** Editor canvas. Renders the scene scaled to fit, with pointer drag/resize on layers. */
export function Canvas({ scene, selected, onSelect, onChange }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);
  const dragRef = useRef<Drag | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setScale(
        Math.min((r.width - 16) / scene.width, (r.height - 16) / scene.height),
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [scene.width, scene.height]);

  const begin = useCallback(
    (e: RPE, layer: Layer, mode: Drag["mode"], corner?: string) => {
      if (layer.locked) return;
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      onSelect(layer.id);
      dragRef.current = {
        id: layer.id,
        mode,
        corner,
        startX: e.clientX,
        startY: e.clientY,
        orig: {
          x: layer.x,
          y: layer.y,
          w: layer.w,
          h: layer.h,
          fontSize: layer.type === "text" ? layer.fontSize : undefined,
        },
      };
    },
    [onSelect],
  );

  const move = useCallback(
    (e: RPE) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = (e.clientX - d.startX) / scale;
      const dy = (e.clientY - d.startY) / scale;
      if (d.mode === "move") {
        onChange(d.id, {
          x: Math.round(d.orig.x + dx),
          y: Math.round(d.orig.y + dy),
        });
        return;
      }
      const layer = scene.layers.find((l) => l.id === d.id);
      if (!layer) return;
      let { x, y, w, h } = d.orig;
      const keepRatio =
        layer.type === "mockup" || layer.type === "image" || e.shiftKey;
      const ratio = d.orig.w / d.orig.h;
      const c = d.corner ?? "se";
      if (c.includes("e")) w = d.orig.w + dx;
      if (c.includes("s")) h = d.orig.h + dy;
      if (c.includes("w")) {
        w = d.orig.w - dx;
        x = d.orig.x + dx;
      }
      if (c.includes("n")) {
        h = d.orig.h - dy;
        y = d.orig.y + dy;
      }
      if (keepRatio) {
        const nh = Math.round(w / ratio);
        if (c.includes("n")) y = d.orig.y + (d.orig.h - nh);
        h = nh;
      }
      w = Math.max(20, Math.round(w));
      h = Math.max(20, Math.round(h));
      const patch: Partial<Layer> = {
        x: Math.round(x),
        y: Math.round(y),
        w,
        h,
      };
      if (layer.type === "text" && d.orig.fontSize && keepRatio) {
        (patch as Partial<Extract<Layer, { type: "text" }>>).fontSize =
          Math.max(8, Math.round((d.orig.fontSize * w) / d.orig.w));
      }
      onChange(d.id, patch);
    },
    [scale, scene.layers, onChange],
  );

  const end = useCallback(() => {
    dragRef.current = null;
  }, []);

  return (
    <div ref={wrap} className="flex h-full w-full items-center justify-center">
      <div
        className="relative shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
        style={{ width: scene.width * scale, height: scene.height * scale }}
        onPointerDown={() => onSelect(null)}
      >
        <div
          style={{
            width: scene.width,
            height: scene.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "relative",
            overflow: "hidden",
            background: backgroundCss(scene.background),
            fontFamily: "Inter",
          }}
        >
          {scene.layers.map((layer) => (
            <LayerBox
              key={layer.id}
              layer={layer}
              selected={layer.id === selected}
              scale={scale}
              begin={begin}
              move={move}
              end={end}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const HANDLES = ["nw", "ne", "sw", "se"];

function LayerBox({
  layer,
  selected,
  scale,
  begin,
  move,
  end,
}: {
  layer: Layer;
  selected: boolean;
  scale: number;
  begin: (e: RPE, layer: Layer, mode: Drag["mode"], corner?: string) => void;
  move: (e: RPE) => void;
  end: () => void;
}) {
  return (
    <div
      onPointerDown={(e) => begin(e, layer, "move")}
      onPointerMove={move}
      onPointerUp={end}
      style={{
        position: "absolute",
        left: layer.x,
        top: layer.y,
        width: layer.w,
        height: layer.h,
        cursor: layer.locked ? "default" : "move",
        outline: selected ? `${2 / scale}px solid #fff` : "none",
        outlineOffset: 0,
        transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
        transformOrigin: "center",
      }}
    >
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <LayerView
          layer={{ ...layer, x: 0, y: 0, rotation: 0 }}
          resolveSrc={(s) => s}
        />
      </div>
      {selected &&
        !layer.locked &&
        HANDLES.map((c) => (
          <div
            key={c}
            onPointerDown={(e) => begin(e, layer, "resize", c)}
            onPointerMove={move}
            onPointerUp={end}
            style={{
              position: "absolute",
              width: 12 / scale,
              height: 12 / scale,
              background: "#fff",
              border: `${1 / scale}px solid #000`,
              left: c.includes("w") ? -6 / scale : undefined,
              right: c.includes("e") ? -6 / scale : undefined,
              top: c.includes("n") ? -6 / scale : undefined,
              bottom: c.includes("s") ? -6 / scale : undefined,
              cursor: c === "nw" || c === "se" ? "nwse-resize" : "nesw-resize",
            }}
          />
        ))}
    </div>
  );
}
