"use client";
import {
  Sparkles,
  Lock,
  Unlock,
  Type,
  Smartphone,
  Image as ImageIcon,
  Square,
  ArrowUp,
  ArrowDown,
  Trash2,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  AlignStartHorizontal,
  AlignEndHorizontal,
  AlignStartVertical,
  AlignEndVertical,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Scene, Layer } from "@/lib/scene";
import { uid } from "@/lib/scene";
import type { AssetDto } from "./types";
import { FONTS, DEFAULT_FONT } from "@/lib/fonts";
import { ICON_IDS } from "@/lib/icons";
import { BackgroundEditor } from "./background-editor";

export type AlignKind =
  "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";

const ALIGN = [
  ["left", "Align left", AlignStartVertical],
  ["hcenter", "Center horizontally", AlignHorizontalJustifyCenter],
  ["right", "Align right", AlignEndVertical],
  ["top", "Align top", AlignStartHorizontal],
  ["vcenter", "Center vertically", AlignVerticalJustifyCenter],
  ["bottom", "Align bottom", AlignEndHorizontal],
] as const;

type Props = {
  scene: Scene | null;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onLayer: (id: string, patch: Partial<Layer>) => void;
  onScene: (fn: (s: Scene) => Scene) => void;
  onAlign: (kind: AlignKind) => void;
  assets: AssetDto[];
};

const ICON = {
  text: Type,
  mockup: Smartphone,
  image: ImageIcon,
  rect: Square,
  icon: Sparkles,
} as const;

const LAYER_NAME = {
  text: "Text",
  mockup: "Phone mockup",
  image: "Image",
  rect: "Shape",
  icon: "Icon",
} as const;

export function Inspector({
  scene,
  selected,
  onSelect,
  onLayer,
  onScene,
  onAlign,
  assets,
}: Props) {
  const layer = scene?.layers.find((l) => l.id === selected) ?? null;
  const assetName = (url: string | null) =>
    assets
      .find((a) => url != null && (a.url === url || url.endsWith(a.url)))
      ?.name.replace(/\.[a-z]+$/i, "");

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
        fontFamily: DEFAULT_FONT,
        fit: "shrink",
        minFontSize: 16,
        textTransform: "none",
        highlightPill: false,
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

  if (!scene)
    return (
      <aside className="flex w-64 shrink-0 items-center justify-center border-l border-border p-6 text-center text-xs text-muted-foreground">
        Select a screen to edit its layers.
      </aside>
    );

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-l border-border text-sm">
      <section className="border-b border-border">
        <div className="flex h-11 items-center justify-between border-b border-border pr-2 pl-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Layers
          </span>
          <div className="flex gap-0.5">
            {(["text", "mockup", "image", "icon", "rect"] as const).map((k) => {
              const I = ICON[k];
              return (
                <Tip key={k} label={`Add ${LAYER_NAME[k].toLowerCase()}`}>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => addLayer(k)}
                    aria-label={`Add ${LAYER_NAME[k].toLowerCase()}`}
                  >
                    <I className="size-3.5" />
                  </Button>
                </Tip>
              );
            })}
          </div>
        </div>
        <ul className="max-h-64 space-y-0.5 overflow-y-auto p-2">
          {[...scene.layers].reverse().map((l) => {
            const I = ICON[l.type];
            const label = layerLabel(l, assetName);
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
        <BackgroundEditor
          value={scene.background}
          imageSrcs={assets.map((a) => a.url)}
          onChange={(background) => onScene((s) => ({ ...s, background }))}
        />
      </section>

      {layer && (
        <section className="space-y-3 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {LAYER_NAME[layer.type]}
            </span>
            <div className="flex gap-0.5">
              <Tip label="Bring forward">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => moveLayer(layer.id, 1)}
                  aria-label="Bring forward"
                >
                  <ArrowUp className="size-3.5" />
                </Button>
              </Tip>
              <Tip label="Send backward">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => moveLayer(layer.id, -1)}
                  aria-label="Send backward"
                >
                  <ArrowDown className="size-3.5" />
                </Button>
              </Tip>
              <Tip label={layer.locked ? "Unlock" : "Lock"}>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => onLayer(layer.id, { locked: !layer.locked })}
                  aria-label={layer.locked ? "Unlock" : "Lock"}
                >
                  {layer.locked ? (
                    <Lock className="size-3.5" />
                  ) : (
                    <Unlock className="size-3.5" />
                  )}
                </Button>
              </Tip>
              <Tip label="Delete layer">
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
              </Tip>
            </div>
          </div>

          <div className="flex justify-between rounded-md border border-border p-0.5">
            {ALIGN.map(([kind, label, I]) => (
              <Tip key={kind} label={label}>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => onAlign(kind)}
                  aria-label={label}
                >
                  <I className="size-3.5" />
                </Button>
              </Tip>
            ))}
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
                    <SelectTrigger className="h-8 w-full text-xs">
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
                    <SelectTrigger className="h-8 w-full text-xs">
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
                <Field label="Font">
                  <Select
                    value={layer.fontFamily}
                    onValueChange={(v) => onLayer(layer.id, { fontFamily: v })}
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONTS.map((f) => (
                        <SelectItem key={f.id} value={f.name}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Case">
                  <Select
                    value={layer.textTransform}
                    onValueChange={(v) =>
                      onLayer(layer.id, { textTransform: v as "none" })
                    }
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">As typed</SelectItem>
                      <SelectItem value="uppercase">UPPERCASE</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Fit">
                  <Select
                    value={layer.fit}
                    onValueChange={(v) =>
                      onLayer(layer.id, { fit: v as "shrink" })
                    }
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shrink">Shrink to fit</SelectItem>
                      <SelectItem value="wrap">
                        Wrap, shrink long words
                      </SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Num
                  label="Min size"
                  value={layer.minFontSize}
                  onChange={(minFontSize) => onLayer(layer.id, { minFontSize })}
                />
                <Field label="Dir">
                  <Select
                    value={layer.dir}
                    onValueChange={(v) =>
                      onLayer(layer.id, { dir: v as "auto" })
                    }
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
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
                  <SelectTrigger className="h-8 w-full text-xs">
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
                  <SelectTrigger className="h-8 w-full text-xs">
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
                  <SelectTrigger className="h-8 w-full text-xs">
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
                  <SelectTrigger className="h-8 w-full text-xs">
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
                  <SelectTrigger className="h-8 w-full text-xs">
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

          {layer.type === "icon" && (
            <div className="grid grid-cols-2 gap-1.5">
              <Field label="Icon">
                <Select
                  value={layer.icon}
                  onValueChange={(icon) => onLayer(layer.id, { icon })}
                >
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_IDS.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Color">
                <Color
                  value={layer.color}
                  onChange={(color) => onLayer(layer.id, { color })}
                />
              </Field>
              <Num
                label="Stroke"
                value={layer.strokeWidth}
                step={0.25}
                onChange={(strokeWidth) => onLayer(layer.id, { strokeWidth })}
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

/** Human name for a layer row: its text, its asset file, or its kind. */
function layerLabel(
  l: Layer,
  assetName: (url: string | null) => string | undefined,
): string {
  if (l.type === "text") return l.text.split("\n")[0] || "Empty text";
  if (l.type === "mockup")
    return assetName(l.src) ?? (l.src ? "Phone mockup" : "Empty mockup");
  if (l.type === "image") return assetName(l.src) ?? "Image";
  if (l.type === "icon") return `Icon · ${l.icon}`;
  return LAYER_NAME[l.type];
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
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
        className="h-8 px-2 text-xs tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
    <div className="flex h-8 min-w-0 items-center gap-1.5 rounded-md border border-input px-1.5 dark:bg-input/30">
      <input
        type="color"
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="size-5 cursor-pointer rounded border-0 bg-transparent p-0"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-0 bg-transparent font-mono text-[11px] uppercase outline-none"
      />
    </div>
  );
}

function Tip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
