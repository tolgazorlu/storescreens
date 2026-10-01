"use client";
import {
  Lock,
  Unlock,
  Type,
  Smartphone,
  Image as ImageIcon,
  Square,
  ArrowUp,
  ArrowDown,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Scene, Layer } from "@/lib/scene";
import { uid } from "@/lib/scene";
import type { AssetDto } from "./types";

type Props = {
  scene: Scene | null;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onLayer: (id: string, patch: Partial<Layer>) => void;
  onScene: (fn: (s: Scene) => Scene) => void;
  assets: AssetDto[];
};

const ICON = {
  text: Type,
  mockup: Smartphone,
  image: ImageIcon,
  rect: Square,
} as const;

export function Inspector({
  scene,
  selected,
  onSelect,
  onLayer,
  onScene,
  assets,
}: Props) {
  const layer = scene?.layers.find((l) => l.id === selected) ?? null;

  function addLayer(kind: Layer["type"]) {
    if (!scene) return;
    const W = scene.width;
    const base = {
      id: uid(kind[0]),
      x: Math.round(W * 0.1),
      y: Math.round(W * 0.1),
      rotation: 0,
      opacity: 1,
      locked: false,
    };
    let l: Layer;
    if (kind === "text")
      l = {
        ...base,
        type: "text",
        text: "Text",
        fontSize: Math.round(W * 0.06),
        fontWeight: 700,
        color: "#ffffff",
        align: "left",
        lineHeight: 1.1,
        letterSpacing: 0,
        dir: "auto",
        w: Math.round(W * 0.8),
        h: Math.round(W * 0.2),
      };
    else if (kind === "mockup")
      l = {
        ...base,
        type: "mockup",
        frame: "iphone",
        src: null,
        frameColor: "#111111",
        shadow: true,
        w: Math.round(W * 0.6),
        h: Math.round(W * 0.6 * 2.05),
      };
    else if (kind === "image")
      l = {
        ...base,
        type: "image",
        src: assets[0]?.url ?? "",
        fit: "contain",
        radius: 0,
        w: Math.round(W * 0.3),
        h: Math.round(W * 0.3),
      };
    else
      l = {
        ...base,
        type: "rect",
        color: "#ffffff",
        radius: Math.round(W * 0.02),
        w: Math.round(W * 0.5),
        h: Math.round(W * 0.3),
      };
    onScene((s) => ({ ...s, layers: [...s.layers, l] }));
    onSelect(l.id);
  }

  function moveLayer(id: string, dir: -1 | 1) {
    onScene((s) => {
      const i = s.layers.findIndex((l) => l.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.layers.length) return s;
      const layers = [...s.layers];
      [layers[i], layers[j]] = [layers[j], layers[i]];
      return { ...s, layers };
    });
  }

  if (!scene) return <aside className="w-64 shrink-0 border-l border-border" />;

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-l border-border text-sm">
      <section className="border-b border-border p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Layers
          </span>
          <div className="flex gap-0.5">
            {(["text", "mockup", "image", "rect"] as const).map((k) => {
              const I = ICON[k];
              return (
                <Button
                  key={k}
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => addLayer(k)}
                  aria-label={`Add ${k}`}
                >
                  <I className="size-3.5" />
                </Button>
              );
            })}
          </div>
        </div>
        <ul className="space-y-0.5">
          {[...scene.layers].reverse().map((l) => {
            const I = ICON[l.type];
            const label = l.type === "text" ? l.text.split("\n")[0] : l.type;
            return (
              <li
                key={l.id}
                onClick={() => onSelect(l.id)}
                className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs ${l.id === selected ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"}`}
              >
                <I className="size-3.5 shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                {l.locked && <Lock className="size-3" />}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="border-b border-border p-3">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Background
        </span>
        <div className="flex items-center gap-2">
          <Select
            value={scene.background.type}
            onValueChange={(t) =>
              onScene((s) => ({
                ...s,
                background:
                  t === "solid"
                    ? {
                        type: "solid",
                        color:
                          s.background.type === "solid"
                            ? s.background.color
                            : s.background.from,
                      }
                    : {
                        type: "gradient",
                        from:
                          s.background.type === "solid"
                            ? s.background.color
                            : s.background.from,
                        to: "#111111",
                        angle: 180,
                      },
              }))
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">Solid</SelectItem>
              <SelectItem value="gradient">Gradient</SelectItem>
            </SelectContent>
          </Select>
          {scene.background.type === "solid" ? (
            <Color
              value={scene.background.color}
              onChange={(color) =>
                onScene((s) => ({ ...s, background: { type: "solid", color } }))
              }
            />
          ) : (
            <>
              <Color
                value={scene.background.from}
                onChange={(from) =>
                  onScene((s) => ({
                    ...s,
                    background:
                      s.background.type === "gradient"
                        ? { ...s.background, from }
                        : s.background,
                  }))
                }
              />
              <Color
                value={scene.background.to}
                onChange={(to) =>
                  onScene((s) => ({
                    ...s,
                    background:
                      s.background.type === "gradient"
                        ? { ...s.background, to }
                        : s.background,
                  }))
                }
              />
            </>
          )}
        </div>
      </section>

      {layer && (
        <section className="space-y-3 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {layer.type}
            </span>
            <div className="flex gap-0.5">
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => moveLayer(layer.id, 1)}
                aria-label="Bring forward"
              >
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => moveLayer(layer.id, -1)}
                aria-label="Send backward"
              >
                <ArrowDown className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => onLayer(layer.id, { locked: !layer.locked })}
                aria-label="Lock"
              >
                {layer.locked ? (
                  <Lock className="size-3.5" />
                ) : (
                  <Unlock className="size-3.5" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => {
                  onScene((s) => ({
                    ...s,
                    layers: s.layers.filter((l) => l.id !== layer.id),
                  }));
                  onSelect(null);
                }}
                aria-label="Delete layer"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <Num
              label="X"
              value={layer.x}
              onChange={(x) => onLayer(layer.id, { x })}
            />
            <Num
              label="Y"
              value={layer.y}
              onChange={(y) => onLayer(layer.id, { y })}
            />
            <Num
              label="W"
              value={layer.w}
              onChange={(w) => onLayer(layer.id, { w })}
            />
            <Num
              label="H"
              value={layer.h}
              onChange={(h) => onLayer(layer.id, { h })}
            />
            <Num
              label="Rot"
              value={layer.rotation}
              onChange={(rotation) => onLayer(layer.id, { rotation })}
            />
            <Num
              label="Op"
              value={layer.opacity}
              step={0.1}
              onChange={(opacity) =>
                onLayer(layer.id, {
                  opacity: Math.min(1, Math.max(0, opacity)),
                })
              }
            />
          </div>

          {layer.type === "text" && (
            <>
              <Textarea
                value={layer.text}
                rows={3}
                className="text-xs"
                onChange={(e) => onLayer(layer.id, { text: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-1.5">
                <Num
                  label="Size"
                  value={layer.fontSize}
                  onChange={(fontSize) => onLayer(layer.id, { fontSize })}
                />
                <Field label="Weight">
                  <Select
                    value={String(layer.fontWeight)}
                    onValueChange={(v) =>
                      onLayer(layer.id, { fontWeight: Number(v) as 400 })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[400, 500, 600, 700, 800].map((wgt) => (
                        <SelectItem key={wgt} value={String(wgt)}>
                          {wgt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Align">
                  <Select
                    value={layer.align}
                    onValueChange={(v) =>
                      onLayer(layer.id, { align: v as "left" })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Color">
                  <Color
                    value={layer.color}
                    onChange={(color) => onLayer(layer.id, { color })}
                  />
                </Field>
                <Field label="Dir">
                  <Select
                    value={layer.dir}
                    onValueChange={(v) =>
                      onLayer(layer.id, { dir: v as "auto" })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="ltr">LTR</SelectItem>
                      <SelectItem value="rtl">RTL</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Num
                  label="Line"
                  value={layer.lineHeight}
                  step={0.05}
                  onChange={(lineHeight) => onLayer(layer.id, { lineHeight })}
                />
                <Num
                  label="Track"
                  value={layer.letterSpacing}
                  onChange={(letterSpacing) =>
                    onLayer(layer.id, { letterSpacing })
                  }
                />
              </div>
            </>
          )}

          {layer.type === "mockup" && (
            <div className="grid grid-cols-2 gap-1.5">
              <Field label="Frame">
                <Select
                  value={layer.frame}
                  onValueChange={(v) =>
                    onLayer(layer.id, { frame: v as "iphone" })
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iphone">iPhone</SelectItem>
                    <SelectItem value="android">Android</SelectItem>
                    <SelectItem value="ipad">iPad</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Bezel">
                <Color
                  value={layer.frameColor}
                  onChange={(frameColor) => onLayer(layer.id, { frameColor })}
                />
              </Field>
              <Field label="Shadow">
                <Select
                  value={layer.shadow ? "on" : "off"}
                  onValueChange={(v) =>
                    onLayer(layer.id, { shadow: v === "on" })
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on">On</SelectItem>
                    <SelectItem value="off">Off</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Screenshot">
                <Select
                  value={layer.src ?? "__none"}
                  onValueChange={(v) =>
                    onLayer(layer.id, { src: v === "__none" ? null : v })
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {assets.map((a) => (
                      <SelectItem key={a.id} value={a.url}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}

          {layer.type === "image" && (
            <div className="grid grid-cols-2 gap-1.5">
              <Field label="Asset">
                <Select
                  value={layer.src}
                  onValueChange={(src) => onLayer(layer.id, { src })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((a) => (
                      <SelectItem key={a.id} value={a.url}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Fit">
                <Select
                  value={layer.fit}
                  onValueChange={(v) =>
                    onLayer(layer.id, { fit: v as "cover" })
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contain">Contain</SelectItem>
                    <SelectItem value="cover">Cover</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Num
                label="Radius"
                value={layer.radius}
                onChange={(radius) => onLayer(layer.id, { radius })}
              />
            </div>
          )}

          {layer.type === "rect" && (
            <div className="grid grid-cols-2 gap-1.5">
              <Field label="Color">
                <Color
                  value={layer.color}
                  onChange={(color) => onLayer(layer.id, { color })}
                />
              </Field>
              <Num
                label="Radius"
                value={layer.radius}
                onChange={(radius) => onLayer(layer.id, { radius })}
              />
            </div>
          )}
        </section>
      )}
    </aside>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        lang="en"
        step={step}
        value={value}
        className="h-7 px-1.5 text-xs"
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

function Color({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex h-7 items-center gap-1 rounded-md border border-input px-1">
      <input
        type="color"
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="size-5 cursor-pointer rounded border-0 bg-transparent p-0"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent font-mono text-[11px] outline-none"
      />
    </div>
  );
}
