"use client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Shuffle, Plus, X } from "lucide-react";
import { BACKGROUND_TYPES, TEXTURE_TYPES, type Background } from "@/lib/scene";

/**
 * One background editor used by both the project Brand panel and the per-screen Inspector
 * override: type tabs, the fields for whichever type is selected, and a shared texture overlay.
 */
export function BackgroundEditor({
  value,
  onChange,
  imageSrcs,
}: {
  value: Background;
  onChange: (bg: Background) => void;
  /** Project assets to pick an "image" background from; omit to hide that type. */
  imageSrcs?: string[];
}) {
  const types = imageSrcs?.length ? BACKGROUND_TYPES : BACKGROUND_TYPES.filter((t) => t !== "image");
  const firstColor = (bg: Background): string =>
    bg.type === "solid"
      ? bg.color
      : bg.type === "gradient" || bg.type === "radial"
        ? bg.from
        : bg.type === "split"
          ? bg.colorA
          : bg.type === "mesh"
            ? bg.colors[0]
            : "#111111";

  function retype(t: Background["type"]) {
    const c = firstColor(value);
    const base = { texture: value.texture, glow: value.glow } as const;
    const next: Background =
      t === "solid"
        ? { type: "solid", color: c, ...base }
        : t === "gradient"
          ? { type: "gradient", from: c, to: "#111111", angle: 180, ...base }
          : t === "radial"
            ? { type: "radial", from: c, to: "#111111", cx: 0.5, cy: 0.5, ...base }
            : t === "split"
              ? { type: "split", colorA: c, colorB: "#111111", angle: 135, split: 0.5, ...base }
              : t === "mesh"
                ? { type: "mesh", seed: 1, base: "#101016", colors: [c, "#7A1FA2", "#F76707"], ...base }
                : { type: "image", src: imageSrcs?.[0] ?? "", dim: 0, ...base };
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <Select value={value.type} onValueChange={(t) => retype(t as Background["type"])}>
        <SelectTrigger className="h-8 w-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {types.map((t) => (
            <SelectItem key={t} value={t}>
              {t[0].toUpperCase() + t.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value.type === "solid" && (
        <ColorRow label="Color" value={value.color} onChange={(color) => onChange({ ...value, color })} />
      )}

      {value.type === "gradient" && (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <ColorRow label="From" value={value.from} onChange={(from) => onChange({ ...value, from })} />
            <ColorRow label="To" value={value.to} onChange={(to) => onChange({ ...value, to })} />
          </div>
          <NumRow label="Angle" value={value.angle} onChange={(angle) => onChange({ ...value, angle })} />
        </>
      )}

      {value.type === "radial" && (
        <div className="grid grid-cols-2 gap-1.5">
          <ColorRow label="From" value={value.from} onChange={(from) => onChange({ ...value, from })} />
          <ColorRow label="To" value={value.to} onChange={(to) => onChange({ ...value, to })} />
        </div>
      )}

      {value.type === "split" && (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <ColorRow label="Color A" value={value.colorA} onChange={(colorA) => onChange({ ...value, colorA })} />
            <ColorRow label="Color B" value={value.colorB} onChange={(colorB) => onChange({ ...value, colorB })} />
          </div>
          <NumRow label="Angle" value={value.angle} onChange={(angle) => onChange({ ...value, angle })} />
        </>
      )}

      {value.type === "mesh" && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Mesh colours
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="size-6"
              aria-label="Shuffle seed"
              onClick={() => onChange({ ...value, seed: Math.floor(Math.random() * 10000) })}
            >
              <Shuffle className="size-3.5" />
            </Button>
          </div>
          <div className="space-y-1.5">
            {value.colors.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="flex-1">
                  <ColorRow
                    value={c}
                    onChange={(nc) =>
                      onChange({ ...value, colors: value.colors.map((x, j) => (j === i ? nc : x)) })
                    }
                  />
                </div>
                {value.colors.length > 2 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6"
                    aria-label="Remove colour"
                    onClick={() => onChange({ ...value, colors: value.colors.filter((_, j) => j !== i) })}
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
              </div>
            ))}
            {value.colors.length < 5 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-full text-xs"
                onClick={() => onChange({ ...value, colors: [...value.colors, "#888888"] })}
              >
                <Plus className="mr-1 size-3" /> Add colour
              </Button>
            )}
          </div>
          <ColorRow label="Base" value={value.base} onChange={(base) => onChange({ ...value, base })} />
        </>
      )}

      {value.type === "image" && (
        <Select value={value.src} onValueChange={(src) => onChange({ ...value, src })}>
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue placeholder="Pick an asset" />
          </SelectTrigger>
          <SelectContent>
            {(imageSrcs ?? []).map((s) => (
              <SelectItem key={s} value={s}>
                {s.split("/").pop()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="space-y-1 border-t border-border pt-2">
        <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Texture
        </span>
        <Select
          value={value.texture?.type ?? "none"}
          onValueChange={(t) =>
            onChange({
              ...value,
              texture:
                t === "none" ? undefined : { type: t as Exclude<typeof TEXTURE_TYPES[number], "none">, opacity: value.texture?.opacity ?? 0.12, color: value.texture?.color ?? "#000000" },
            })
          }
        >
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEXTURE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {value.texture && (
          <div className="flex items-center gap-2 pt-1">
            <Slider
              min={0}
              max={1}
              step={0.02}
              value={[value.texture.opacity]}
              onValueChange={([opacity]) => onChange({ ...value, texture: { ...value.texture!, opacity } })}
              className="flex-1"
            />
            <span className="w-8 text-right text-[10px] tabular-nums text-muted-foreground">
              {Math.round(value.texture.opacity * 100)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const field = (
    <div className="flex h-8 min-w-0 items-center gap-1.5 rounded-md border border-input px-1.5 dark:bg-input/30">
      <input
        type="color"
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="size-4 cursor-pointer rounded-sm border-0 bg-transparent p-0"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-0 bg-transparent font-mono text-[11px] uppercase outline-none"
      />
    </div>
  );
  if (!label) return field;
  return (
    <label className="block space-y-1">
      <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {field}
    </label>
  );
}

function NumRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block space-y-1">
      <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        lang="en"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-full rounded-md border border-input px-2 text-xs tabular-nums outline-none dark:bg-input/30"
      />
    </label>
  );
}
