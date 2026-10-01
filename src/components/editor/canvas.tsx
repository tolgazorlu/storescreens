"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as RPE,
  type CSSProperties,
} from "react";
import type { Scene, Layer } from "@/lib/scene";
import { backgroundCss } from "@/lib/scene";
import { LayerView } from "@/components/scene/scene-view";

export type CanvasOverlays = {
  grid: boolean;
  safeArea: boolean;
  outlines: boolean;
};

type Props = {
  scene: Scene;
  selected: string | null;
  zoom: number | "fit";
  overlays: CanvasOverlays;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<Layer>) => void;
  onZoom: (z: number | "fit") => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
};

type Drag = {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  orig: { x: number; y: number; w: number; h: number; fontSize?: number };
  corner?: string;
};

type Guide = { axis: "x" | "y"; at: number };

/** Snap threshold in screen px, converted to scene px per scale. */
const SNAP_PX = 6;

/**
 * Editor canvas. Renders the scene scaled, with pointer drag/resize on layers,
 * snapping to canvas center / edges / other layers, and visible guide lines.
 */
export function Canvas({
  scene,
  selected,
  zoom,
  overlays,
  onSelect,
  onChange,
  onZoom,
  onDragStart,
  onDragEnd,
}: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(0.2);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<Drag | null>(null);
  const scale = zoom === "fit" ? fitScale : zoom;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setFitScale(
        Math.min((r.width - 48) / scene.width, (r.height - 48) / scene.height),
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [scene.width, scene.height]);

  // ⌘/ctrl + wheel zooms; plain wheel scrolls the container.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      const next = Math.min(
        2,
        Math.max(0.05, scale * (e.deltaY < 0 ? 1.1 : 0.9)),
      );
      onZoom(Number(next.toFixed(3)));
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scale, onZoom]);

  const begin = useCallback(
    (e: RPE, layer: Layer, mode: Drag["mode"], corner?: string) => {
      if (layer.locked) return;
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      onSelect(layer.id);
      setDragging(true);
      onDragStart?.();
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
    [onSelect, onDragStart],
  );

  const move = useCallback(
    (e: RPE) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = (e.clientX - d.startX) / scale;
      const dy = (e.clientY - d.startY) / scale;
      const layer = scene.layers.find((l) => l.id === d.id);
      if (!layer) return;

      if (d.mode === "move") {
        let x = d.orig.x + dx;
        let y = d.orig.y + dy;
        const found: Guide[] = [];
        if (!e.altKey) {
          const snapped = snap(
            { x, y, w: d.orig.w, h: d.orig.h },
            scene,
            d.id,
            SNAP_PX / scale,
          );
          x = snapped.x;
          y = snapped.y;
          found.push(...snapped.guides);
        }
        setGuides(found);
        onChange(d.id, { x: Math.round(x), y: Math.round(y) });
        return;
      }

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
    [scale, scene, onChange],
  );

  const end = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setGuides([]);
    setDragging(false);
    onDragEnd?.();
  }, [onDragEnd]);

  const sel = scene.layers.find((l) => l.id === selected);
  const pad = Math.round(scene.width * 0.06);

  return (
    <div ref={wrap} className="relative h-full w-full overflow-auto">
      <div className="flex min-h-full min-w-full items-center justify-center p-6">
        <div
          className="relative shrink-0 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_20px_60px_rgba(0,0,0,0.5)]"
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
                outline={overlays.outlines}
                scale={scale}
                begin={begin}
                move={move}
                end={end}
              />
            ))}

            {/* overlays, in scene px, pointer-transparent */}
            {overlays.grid && (
              <Grid w={scene.width} h={scene.height} scale={scale} />
            )}
            {overlays.safeArea && (
              <div
                style={{
                  position: "absolute",
                  left: pad,
                  top: pad,
                  width: scene.width - pad * 2,
                  height: scene.height - pad * 2,
                  border: `${1 / scale}px dashed rgba(255,255,255,0.35)`,
                  pointerEvents: "none",
                }}
              />
            )}
            {guides.map((g, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  pointerEvents: "none",
                  background: "#ff3d7f",
                  ...(g.axis === "x"
                    ? {
                        left: g.at,
                        top: 0,
                        width: 1 / scale,
                        height: scene.height,
                      }
                    : {
                        top: g.at,
                        left: 0,
                        height: 1 / scale,
                        width: scene.width,
                      }),
                }}
              />
            ))}
          </div>

          {dragging && sel && (
            <div
              className="pointer-events-none absolute rounded bg-black/80 px-1.5 py-0.5 font-mono text-[10px] text-white"
              style={{ left: sel.x * scale, top: (sel.y + sel.h) * scale + 6 }}
            >
              {sel.x}, {sel.y} · {sel.w}×{sel.h}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Snap a moving box to canvas center/edges and other layers' edges/centers. */
function snap(
  box: { x: number; y: number; w: number; h: number },
  scene: Scene,
  selfId: string,
  tol: number,
) {
  const xs: number[] = [0, scene.width / 2, scene.width];
  const ys: number[] = [0, scene.height / 2, scene.height];
  for (const l of scene.layers) {
    if (l.id === selfId) continue;
    xs.push(l.x, l.x + l.w / 2, l.x + l.w);
    ys.push(l.y, l.y + l.h / 2, l.y + l.h);
  }
  const guides: Guide[] = [];
  let { x, y } = box;

  const cands = (pos: number, size: number, targets: number[]) => {
    let best: { delta: number; at: number } | null = null;
    for (const edge of [pos, pos + size / 2, pos + size]) {
      for (const t of targets) {
        const delta = t - edge;
        if (
          Math.abs(delta) <= tol &&
          (!best || Math.abs(delta) < Math.abs(best.delta))
        )
          best = { delta, at: t };
      }
    }
    return best;
  };
  const sx = cands(x, box.w, xs);
  if (sx) {
    x += sx.delta;
    guides.push({ axis: "x", at: sx.at });
  }
  const sy = cands(y, box.h, ys);
  if (sy) {
    y += sy.delta;
    guides.push({ axis: "y", at: sy.at });
  }
  return { x, y, guides };
}

function Grid({ w, h, scale }: { w: number; h: number; scale: number }) {
  const step = w / 12;
  const line = `rgba(255,255,255,0.12)`;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage: `linear-gradient(to right, ${line} ${1 / scale}px, transparent ${1 / scale}px), linear-gradient(to bottom, ${line} ${1 / scale}px, transparent ${1 / scale}px)`,
        backgroundSize: `${step}px ${step}px`,
        width: w,
        height: h,
      }}
    />
  );
}

const HANDLES = ["nw", "ne", "sw", "se"];

function LayerBox({
  layer,
  selected,
  outline,
  scale,
  begin,
  move,
  end,
}: {
  layer: Layer;
  selected: boolean;
  outline: boolean;
  scale: number;
  begin: (e: RPE, layer: Layer, mode: Drag["mode"], corner?: string) => void;
  move: (e: RPE) => void;
  end: () => void;
}) {
  const px = 1 / scale;
  const style: CSSProperties = {
    position: "absolute",
    left: layer.x,
    top: layer.y,
    width: layer.w,
    height: layer.h,
    cursor: layer.locked ? "default" : "move",
    outline: selected
      ? `${2 * px}px solid #fff`
      : outline
        ? `${px}px dashed rgba(255,255,255,0.4)`
        : "none",
    outlineOffset: 0,
    transformOrigin: "center",
  };
  if (layer.rotation) style.transform = `rotate(${layer.rotation}deg)`;
  return (
    <div
      onPointerDown={(e) => begin(e, layer, "move")}
      onPointerMove={move}
      onPointerUp={end}
      style={style}
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
              width: 12 * px,
              height: 12 * px,
              background: "#fff",
              border: `${px}px solid #000`,
              left: c.includes("w") ? -6 * px : undefined,
              right: c.includes("e") ? -6 * px : undefined,
              top: c.includes("n") ? -6 * px : undefined,
              bottom: c.includes("s") ? -6 * px : undefined,
              cursor: c === "nw" || c === "se" ? "nwse-resize" : "nesw-resize",
            }}
          />
        ))}
    </div>
  );
}
