"use client";
import { useMemo, useState } from "react";
import { X, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/fetcher";
import { DEVICES, DEVICE_IDS, type DeviceId } from "@/lib/devices";
import {
  buildScene,
  TEMPLATE_IDS,
  TEMPLATE_LABELS,
  type TemplateId,
} from "@/lib/templates";
import { SceneView } from "@/components/scene/scene-view";
import type { AssetDto, ProjectDto, ScreenDto } from "./types";

type Row = {
  template: TemplateId;
  title: string;
  subtitle: string;
  screenshot: string | null;
};

type Props = {
  project: ProjectDto;
  assets: AssetDto[];
  locale: string;
  device: DeviceId;
  onClose: () => void;
  onGenerated: (
    rows: ScreenDto[],
    locale: string,
    device: DeviceId,
    replaced: boolean,
  ) => void;
};

const ROTATION: TemplateId[] = [
  "hero",
  "title-top",
  "caption-bottom",
  "title-top",
  "caption-bottom",
  "split",
];

/**
 * Right-side panel: one card per screen with live preview. Screenshots are
 * picked visually, templates by thumbnail. Replaces the old cramped dialog.
 */
export function GeneratePanel({
  project,
  assets,
  locale: initialLocale,
  device: initialDevice,
  onClose,
  onGenerated,
}: Props) {
  const shots = assets.filter((a) => a.kind === "screenshot");
  const logos = assets.filter((a) => a.kind !== "screenshot");
  const [locale, setLocale] = useState(initialLocale);
  const [device, setDevice] = useState<DeviceId>(initialDevice);
  const [logo, setLogo] = useState<string>(() => logos[0]?.id ?? "__none");
  const [bg, setBg] = useState("#2E3DF2");
  const [textColor, setTextColor] = useState("#ffffff");
  const [replace, setReplace] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[]>(() =>
    (shots.length ? shots : [null, null, null]).slice(0, 10).map((a, i) => ({
      template: ROTATION[i % ROTATION.length],
      title: "",
      subtitle: "",
      screenshot: a?.id ?? null,
    })),
  );

  const assetUrl = (id: string | null) =>
    id ? (assets.find((a) => a.id === id)?.url ?? null) : null;
  const dev = DEVICES[device];
  const previews = useMemo(
    () =>
      rows.map((r) =>
        buildScene(dev, r.template, {
          title: r.title || "Headline",
          subtitle: r.subtitle || undefined,
          screenshot: assetUrl(r.screenshot),
          logo: logo === "__none" ? null : assetUrl(logo),
          background: { type: "solid", color: bg },
          textColor,
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, dev, logo, bg, textColor, assets],
  );

  const set = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const moveRow = (i: number, d: -1 | 1) =>
    setRows((rs) => {
      const j = i + d;
      if (j < 0 || j >= rs.length) return rs;
      const c = [...rs];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  async function run() {
    setBusy(true);
    try {
      const out = await api<ScreenDto[]>(
        `/api/projects/${project.id}/screens`,
        {
          method: "POST",
          json: {
            locale,
            device,
            logo: logo === "__none" ? null : logo,
            background: { type: "solid", color: bg },
            textColor,
            replace,
            screens: rows.map((r) => ({
              ...r,
              title: r.title || "Headline",
              subtitle: r.subtitle || undefined,
            })),
          },
        },
      );
      onGenerated(out, locale, device, replace);
      toast.success(`${out.length} screens generated`);
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="flex w-[420px] shrink-0 flex-col border-l border-border">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-sm font-medium">Generate screens</span>
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

      <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-border p-3 text-sm">
        <Field label="Locale">
          <Input
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="h-8"
          />
        </Field>
        <Field label="Device">
          <Select
            value={device}
            onValueChange={(v) => setDevice(v as DeviceId)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEVICE_IDS.map((id) => (
                <SelectItem key={id} value={id}>
                  {DEVICES[id].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Logo">
          <Select value={logo} onValueChange={setLogo}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">None</SelectItem>
              {logos.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Background / text">
          <div className="flex h-8 gap-1">
            <ColorInput value={bg} onChange={setBg} />
            <ColorInput value={textColor} onChange={setTextColor} />
          </div>
        </Field>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {rows.map((r, i) => {
          const sc = previews[i];
          const pw = 96;
          const k = pw / sc.width;
          return (
            <div
              key={i}
              className="flex gap-3 rounded-md border border-border p-2"
            >
              <div
                className="shrink-0 overflow-hidden rounded-sm ring-1 ring-border"
                style={{ width: pw, height: Math.round(sc.height * k) }}
              >
                <div
                  style={{
                    width: sc.width,
                    height: sc.height,
                    transform: `scale(${k})`,
                    transformOrigin: "top left",
                    pointerEvents: "none",
                  }}
                >
                  <SceneView scene={sc} />
                </div>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center gap-1">
                  <span className="w-5 font-mono text-[11px] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Select
                    value={r.template}
                    onValueChange={(v) => set(i, { template: v as TemplateId })}
                  >
                    <SelectTrigger className="h-7 flex-1 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_IDS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TEMPLATE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => moveRow(i, -1)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={i === 0}
                    aria-label="Move up"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    onClick={() => moveRow(i, 1)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={i === rows.length - 1}
                    aria-label="Move down"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setRows(rows.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <Input
                  placeholder="Title"
                  value={r.title}
                  className="h-7 text-xs"
                  onChange={(e) => set(i, { title: e.target.value })}
                />
                <Input
                  placeholder="Subtitle (optional)"
                  value={r.subtitle}
                  className="h-7 text-xs"
                  onChange={(e) => set(i, { subtitle: e.target.value })}
                />
                {r.template !== "text-only" && (
                  <div className="flex gap-1 overflow-x-auto pb-0.5">
                    <ShotPick
                      active={r.screenshot === null}
                      onClick={() => set(i, { screenshot: null })}
                      label="none"
                    />
                    {shots.map((a) => (
                      <ShotPick
                        key={a.id}
                        active={r.screenshot === a.id}
                        onClick={() => set(i, { screenshot: a.id })}
                        url={a.url}
                        label={a.name}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={rows.length >= 10}
          onClick={() =>
            setRows([
              ...rows,
              {
                template: ROTATION[rows.length % ROTATION.length],
                title: "",
                subtitle: "",
                screenshot: null,
              },
            ])
          }
        >
          <Plus className="size-4" /> Add screen ({rows.length}/10)
        </Button>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border p-3">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={replace}
            onChange={(e) => setReplace(e.target.checked)}
          />
          Replace {locale}/{device}
        </label>
        <Button onClick={run} disabled={busy || !rows.length}>
          {busy ? "Generating" : `Generate ${rows.length}`}
        </Button>
      </div>
    </aside>
  );
}

function ShotPick({
  active,
  onClick,
  url,
  label,
}: {
  active: boolean;
  onClick: () => void;
  url?: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex h-12 w-7 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-[#222] ${active ? "ring-2 ring-foreground" : "ring-1 ring-border hover:ring-muted-foreground"}`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="h-full w-full object-cover" />
      ) : (
        <span className="text-[9px] text-muted-foreground">–</span>
      )}
    </button>
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
    <label className="flex flex-1 cursor-pointer items-center gap-1.5 rounded-md border border-input px-1.5">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="size-4 cursor-pointer rounded-sm border-0 bg-transparent p-0"
      />
      <span className="font-mono text-[11px]">{value}</span>
    </label>
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
