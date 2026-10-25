"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/fetcher";
import { BRAND_PRESETS, PRESET_GROUPS, applyPreset, type Brand } from "@/lib/brand";
import { backgroundSvgDataUrl } from "@/lib/background";
import { FONTS } from "@/lib/fonts";
import { DEVICES } from "@/lib/devices";
import { buildScene } from "@/lib/templates";
import { SceneView } from "@/components/scene/scene-view";
import { BackgroundEditor } from "./background-editor";
import type { ProjectDto } from "./types";

/** Project brand: colors, font, title style, template knobs. Applied to every generate call. */
export function BrandPanel({
  project,
  brand,
  onChange,
  onClose,
}: {
  project: ProjectDto;
  brand: Brand;
  onChange: (b: Brand) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Brand>(brand);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<Brand>) => setDraft((d) => ({ ...d, ...patch }));

  async function save() {
    setBusy(true);
    try {
      const p = await api<{ brand: Brand }>(`/api/projects/${project.id}`, {
        method: "PATCH",
        json: { brand: draft },
      });
      onChange(p.brand);
      toast.success("Brand saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const preview = buildScene(DEVICES["iphone-6.9"], "hero-bleed", {
    title: "Headline goes here",
    subtitle: "A short line about the feature.",
    brand: draft,
  });
  const pw = 160;
  const k = pw / preview.width;

  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-l border-border">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-sm font-medium">Brand</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 text-sm">
        <div className="flex gap-3">
          <div
            className="shrink-0 overflow-hidden rounded-sm ring-1 ring-border"
            style={{ width: pw, height: Math.round(preview.height * k) }}
          >
            <div
              style={{
                width: preview.width,
                height: preview.height,
                transform: `scale(${k})`,
                transformOrigin: "top left",
                pointerEvents: "none",
              }}
            >
              <SceneView scene={preview} />
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <Field label="Theme">
              <p className="text-xs text-muted-foreground">
                Pick a theme below, then tweak colours and type.
              </p>
            </Field>
          </div>
        </div>

        <div className="space-y-1.5">
          {PRESET_GROUPS.map((group) => (
            <div key={group}>
              <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {group}
              </span>
              <div className="grid grid-cols-6 gap-1.5">
                {Object.entries(BRAND_PRESETS)
                  .filter(([, p]) => p.group === group)
                  .map(([id, p]) => (
                    <button
                      key={id}
                      type="button"
                      title={p.label}
                      onClick={() => setDraft(applyPreset(id))}
                      className="aspect-square rounded-md ring-1 ring-border transition hover:ring-2 hover:ring-foreground"
                      style={{
                        backgroundImage: `url(${backgroundSvgDataUrl(p.brand.background ?? draft.background, 64, 64)})`,
                        backgroundSize: "cover",
                      }}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Background
            </span>
            <BackgroundEditor value={draft.background} onChange={(background) => set({ background })} />
          </div>
          <Field label="Text">
            <ColorInput
              value={draft.textColor}
              onChange={(textColor) => set({ textColor })}
            />
          </Field>
          <Field label="Accent (subtitle, icons)">
            <ColorInput
              value={draft.accent}
              onChange={(accent) => set({ accent })}
            />
          </Field>
          <Field label="Phone frame">
            <ColorInput
              value={draft.frameColor}
              onChange={(frameColor) => set({ frameColor })}
            />
          </Field>
          <Field label="Font">
            <Select
              value={draft.fontFamily}
              onValueChange={(fontFamily) => set({ fontFamily })}
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
          <Field label="Title weight">
            <Select
              value={String(draft.titleWeight)}
              onValueChange={(v) =>
                set({ titleWeight: Number(v) as Brand["titleWeight"] })
              }
            >
              <SelectTrigger className="h-8 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[400, 500, 600, 700, 800].map((w) => (
                  <SelectItem key={w} value={String(w)}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Title case">
            <Select
              value={draft.titleCase}
              onValueChange={(v) => set({ titleCase: v as Brand["titleCase"] })}
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
          <Num
            label="Title scale"
            value={draft.titleScale}
            step={0.05}
            onChange={(titleScale) => set({ titleScale })}
          />
          <Num
            label="Subtitle scale"
            value={draft.subtitleScale}
            step={0.05}
            onChange={(subtitleScale) => set({ subtitleScale })}
          />
          <Num
            label="Title -> subtitle gap"
            value={draft.titleGap}
            step={0.1}
            onChange={(titleGap) => set({ titleGap })}
          />
          <Field label="Highlight style">
            <Select
              value={draft.highlightPill ? "pill" : "color"}
              onValueChange={(v) => set({ highlightPill: v === "pill" })}
            >
              <SelectTrigger className="h-8 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="color">*word* in accent colour</SelectItem>
                <SelectItem value="pill">*word* on a pill</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Num
            label="Phone scale"
            value={draft.phoneScale}
            step={0.05}
            onChange={(phoneScale) => set({ phoneScale })}
          />
          <Num
            label="Phone offset Y"
            value={draft.phoneOffsetY}
            step={0.01}
            onChange={(phoneOffsetY) => set({ phoneOffsetY })}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Use *word* in a title to highlight it in the accent colour.
        </p>
        <p className="text-xs text-muted-foreground">
          Existing screens keep their look; brand applies to the next Generate.
        </p>
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t border-border p-3">
        <Button variant="outline" onClick={() => setDraft(brand)}>
          Reset
        </Button>
        <Button onClick={save} disabled={busy}>
          Save brand
        </Button>
      </div>
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

function ColorInput({
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
        className="size-4 cursor-pointer rounded-sm border-0 bg-transparent p-0"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-0 bg-transparent font-mono text-[11px] uppercase outline-none"
      />
    </div>
  );
}
