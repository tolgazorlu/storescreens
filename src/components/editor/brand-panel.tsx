"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/fetcher";
import { BRAND_PRESETS, applyPreset, type Brand } from "@/lib/brand";
import { FONTS } from "@/lib/fonts";
import { DEVICES } from "@/lib/devices";
import { buildScene } from "@/lib/templates";
import { SceneView } from "@/components/scene/scene-view";
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
            <Field label="Preset">
              <Select
                value=""
                onValueChange={(id) => setDraft(applyPreset(id))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Apply preset" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BRAND_PRESETS).map(([id, p]) => (
                    <SelectItem key={id} value={id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <p className="text-xs text-muted-foreground">
              Presets replace every field below; tweak after applying.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Background">
            <Select
              value={draft.background.type}
              onValueChange={(t) =>
                set({
                  background:
                    t === "solid"
                      ? {
                          type: "solid",
                          color:
                            draft.background.type === "solid"
                              ? draft.background.color
                              : draft.background.from,
                        }
                      : {
                          type: "gradient",
                          from:
                            draft.background.type === "solid"
                              ? draft.background.color
                              : draft.background.from,
                          to: "#111111",
                          angle: 160,
                        },
                })
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
          </Field>
          {draft.background.type === "solid" ? (
            <Field label="Color">
              <ColorInput
                value={draft.background.color}
                onChange={(color) =>
                  set({ background: { type: "solid", color } })
                }
              />
            </Field>
          ) : (
            <>
              <Field label="From">
                <ColorInput
                  value={draft.background.from}
                  onChange={(from) =>
                    set({
                      background: {
                        ...(draft.background as {
                          type: "gradient";
                          from: string;
                          to: string;
                          angle: number;
                        }),
                        from,
                      },
                    })
                  }
                />
              </Field>
              <Field label="To">
                <ColorInput
                  value={draft.background.to}
                  onChange={(to) =>
                    set({
                      background: {
                        ...(draft.background as {
                          type: "gradient";
                          from: string;
                          to: string;
                          angle: number;
                        }),
                        to,
                      },
                    })
                  }
                />
              </Field>
            </>
          )}
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
              <SelectTrigger className="h-8 text-xs">
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
              <SelectTrigger className="h-8 text-xs">
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
              <SelectTrigger className="h-8 text-xs">
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
        className="h-8 px-1.5 text-xs"
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
    <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-input px-1.5">
      <input
        type="color"
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="size-4 cursor-pointer rounded-sm border-0 bg-transparent p-0"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent font-mono text-[11px] outline-none"
      />
    </label>
  );
}
