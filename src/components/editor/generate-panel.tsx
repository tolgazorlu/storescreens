"use client";
import { useMemo, useState } from "react";
import { X, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
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
import { DEVICES, DEVICE_IDS, type DeviceId } from "@/lib/devices";
import {
  buildScene,
  TEMPLATE_IDS,
  TEMPLATE_LABELS,
  type TemplateId,
} from "@/lib/templates";
import {
  buildLayoutScenes,
  IPHONE_FRAMES,
  LAYOUT_KEYS,
  LAYOUTS,
  layoutFrameFor,
  STYLE_KEYS,
  STYLES,
  styleLayout,
  type IphoneFrame,
  type LayoutKey,
  type StyleKey,
} from "@/lib/layouts";
import type { Scene } from "@/lib/scene";
import { backgroundSvgDataUrl } from "@/lib/background";
import { SceneView } from "@/components/scene/scene-view";
import type { AssetDto, ProjectDto, ScreenDto } from "./types";
import type { Brand } from "@/lib/brand";

/** A classic template id, or `layout:<key>` for a goldie layout. */
type RowTemplate = TemplateId | `layout:${LayoutKey}`;
const layoutKeyOf = (t: RowTemplate) =>
  t.startsWith("layout:") ? (t.slice(7) as LayoutKey) : null;
const TWO_SHOT = new Set<string>(["two-phones", "layout:duo", "layout:duo-tilt", "layout:panorama-duo"]);

type Row = {
  template: RowTemplate;
  title: string;
  subtitle: string;
  eyebrow: string;
  screenshot: string | null;
  screenshot2: string | null;
  bullets: string;
};

type Props = {
  project: ProjectDto;
  brand: Brand;
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
  brand,
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
  const [allDevices, setAllDevices] = useState(true);
  const [logo, setLogo] = useState<string>(() => logos[0]?.id ?? "__none");
  const [replace, setReplace] = useState(true);
  const [busy, setBusy] = useState(false);
  const [style, setStyle] = useState<StyleKey | "__none">(() =>
    layoutFrameFor(DEVICES[initialDevice]) ? "editorial" : "__none",
  );
  const [frame, setFrame] = useState<IphoneFrame>("iphone-17-pro-blue");
  const rowTemplate = (s: StyleKey | "__none", i: number): RowTemplate =>
    s === "__none" ? ROTATION[i % ROTATION.length] : `layout:${styleLayout(s, i)}`;
  const [rows, setRows] = useState<Row[]>(() =>
    (shots.length ? shots : [null, null, null]).slice(0, 10).map((a, i) => ({
      template: rowTemplate(style, i),
      title: "",
      subtitle: "",
      eyebrow: "",
      screenshot: a?.id ?? null,
      screenshot2: null,
      bullets: "",
    })),
  );
  const parseBullets = (b: string) =>
    b
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => ({ text: l }));

  const assetUrl = (id: string | null) =>
    id ? (assets.find((a) => a.id === id)?.url ?? null) : null;
  const dev = DEVICES[device];
  const hasLayouts = !!layoutFrameFor(dev);
  const previews = useMemo(
    (): Scene[][] =>
      rows.map((r) => {
        const key = layoutKeyOf(r.template);
        const p = {
          title: r.title || "Headline",
          subtitle: r.subtitle || undefined,
          eyebrow: r.eyebrow || undefined,
          screenshot: assetUrl(r.screenshot),
          screenshot2: assetUrl(r.screenshot2),
        };
        if (key) return buildLayoutScenes(dev, key, { ...p, brand, frame });
        return [
          buildScene(dev, r.template as TemplateId, {
            ...p,
            bullets: parseBullets(r.bullets),
            logo: logo === "__none" ? null : assetUrl(logo),
            brand,
          }),
        ];
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, dev, logo, brand, assets, frame],
  );
  const pickStyle = (s: StyleKey | "__none") => {
    setStyle(s);
    setRows((rs) => rs.map((r, i) => ({ ...r, template: rowTemplate(s, i) })));
  };

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
            replace,
            allDevices,
            frame,
            screens: rows.map((r) => ({
              ...(layoutKeyOf(r.template)
                ? { layout: layoutKeyOf(r.template) }
                : { template: r.template }),
              screenshot: r.screenshot,
              screenshot2: r.screenshot2,
              bullets:
                r.template === "feature-list"
                  ? parseBullets(r.bullets)
                  : undefined,
              title: r.title || "Headline",
              subtitle: r.subtitle || undefined,
              eyebrow: r.eyebrow || undefined,
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
            className="h-8 text-xs"
          />
        </Field>
        <Field label="Device">
          <Select
            value={device}
            onValueChange={(v) => {
              setDevice(v as DeviceId);
              if (layoutFrameFor(DEVICES[v as DeviceId])) return;
              setStyle("__none");
              setRows((rs) =>
                rs.map((r, i) =>
                  layoutKeyOf(r.template) ? { ...r, template: rowTemplate("__none", i) } : r,
                ),
              );
            }}
          >
            <SelectTrigger className="h-8 w-full text-xs">
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
            <SelectTrigger className="h-8 w-full text-xs">
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
        <Field label="Style">
          <Select value={style} onValueChange={(v) => pickStyle(v as StyleKey | "__none")}>
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {hasLayouts && STYLE_KEYS.map((s) => (
                <SelectItem key={s} value={s}>
                  {STYLES[s].label}
                </SelectItem>
              ))}
              <SelectItem value="__none">Classic templates</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Frame">
          <Select value={frame} onValueChange={(v) => setFrame(v as IphoneFrame)}>
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IPHONE_FRAMES.map((f) => (
                <SelectItem key={f} value={f}>
                  {f.replace("iphone-17-pro-", "iPhone 17 Pro ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Brand">
          <div className="flex h-8 items-center gap-1.5 rounded-md border border-input px-2 text-xs text-muted-foreground dark:bg-input/30">
            <span
              className="size-3 rounded-sm"
              style={{
                backgroundImage: `url(${backgroundSvgDataUrl(brand.background, 24, 24)})`,
                backgroundSize: "cover",
              }}
            />
            <span
              className="size-3 rounded-sm"
              style={{ background: brand.textColor }}
            />
            <span className="truncate">
              {brand.fontFamily}, {brand.titleWeight}
            </span>
          </div>
        </Field>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {rows.map((r, i) => {
          const tiles = previews[i];
          // A panorama previews both tiles at the same total width.
          const pw = 96 / tiles.length;
          const k = pw / tiles[0].width;
          return (
            <div
              key={i}
              className="flex gap-3 rounded-md border border-border p-2"
            >
              <div
                className="flex shrink-0 overflow-hidden rounded-sm ring-1 ring-border"
                style={{ width: 96, height: Math.round(tiles[0].height * k) }}
              >
                {tiles.map((sc, ti) => (
                  <div key={ti} style={{ width: pw, height: Math.round(sc.height * k), overflow: "hidden" }}>
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
                ))}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center gap-1">
                  <span className="w-5 font-mono text-[11px] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Select
                    value={r.template}
                    onValueChange={(v) => set(i, { template: v as RowTemplate })}
                  >
                    <SelectTrigger className="h-7 min-w-0 flex-1 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {hasLayouts && LAYOUT_KEYS.map((k) => (
                        <SelectItem key={k} value={`layout:${k}`}>
                          {LAYOUTS[k].label}
                          {LAYOUTS[k].span === 2 ? " (2 tiles)" : ""}
                        </SelectItem>
                      ))}
                      {TEMPLATE_IDS.map((t) => (
                        <SelectItem key={t} value={t}>
                          Classic: {TEMPLATE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => moveRow(i, -1)}
                    className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                    disabled={i === 0}
                    aria-label="Move up"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    onClick={() => moveRow(i, 1)}
                    className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                    disabled={i === rows.length - 1}
                    aria-label="Move down"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setRows(rows.filter((_, j) => j !== i))}
                    className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
                {layoutKeyOf(r.template) && LAYOUTS[layoutKeyOf(r.template)!].copy.eyebrow && (
                  <Input
                    placeholder="Eyebrow label (optional)"
                    value={r.eyebrow}
                    className="h-7 text-xs"
                    onChange={(e) => set(i, { eyebrow: e.target.value })}
                  />
                )}
                {r.template === "feature-list" && (
                  <textarea
                    placeholder={"One bullet per line (max 4)"}
                    value={r.bullets}
                    rows={3}
                    className="rounded-md border border-input bg-transparent px-2 py-1.5 text-xs outline-none focus-visible:border-ring dark:bg-input/30"
                    onChange={(e) => set(i, { bullets: e.target.value })}
                  />
                )}
                {r.template !== "text-only" && (
                  <div className="-mx-0.5 flex gap-1.5 overflow-x-auto p-0.5">
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
                {TWO_SHOT.has(r.template) && (
                  <div className="-mx-0.5 flex gap-1.5 overflow-x-auto p-0.5">
                    <span className="w-5 self-center text-[10px] text-muted-foreground">
                      2nd
                    </span>
                    <ShotPick
                      active={r.screenshot2 === null}
                      onClick={() => set(i, { screenshot2: null })}
                      label="same"
                    />
                    {shots.map((a) => (
                      <ShotPick
                        key={a.id}
                        active={r.screenshot2 === a.id}
                        onClick={() => set(i, { screenshot2: a.id })}
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
                template: rowTemplate(style, rows.length),
                title: "",
                subtitle: "",
                eyebrow: "",
                screenshot: null,
                screenshot2: null,
                bullets: "",
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
            className="size-3.5 accent-foreground"
            onChange={(e) => setReplace(e.target.checked)}
          />
          Replace existing {locale} · {DEVICES[device].label}
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={allDevices}
            className="size-3.5 accent-foreground"
            onChange={(e) => setAllDevices(e.target.checked)}
          />
          All device mockups
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
      className={`flex h-12 w-7 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted ${active ? "ring-2 ring-foreground" : "ring-1 ring-border hover:ring-muted-foreground"}`}
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
