"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Palette,
  ChevronLeft,
  Download,
  Plus,
  Trash2,
  Copy,
  Sparkles,
  LayoutGrid,
  Square,
  Grid3x3,
  Frame,
  BoxSelect,
  Undo2,
  Redo2,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  AlignStartHorizontal,
  AlignEndHorizontal,
  AlignStartVertical,
  AlignEndVertical,
} from "lucide-react";
import { toast } from "sonner";
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
import { api } from "@/lib/fetcher";
import { DEVICES, DEVICE_IDS, type DeviceId } from "@/lib/devices";
import type { Scene, Layer } from "@/lib/scene";
import { Canvas, type CanvasOverlays } from "./canvas";
import { GridView } from "./grid-view";
import { Inspector } from "./inspector";
import { AssetsPanel } from "./assets-panel";
import { GeneratePanel } from "./generate-panel";
import { BrandPanel } from "./brand-panel";
import type { Brand } from "@/lib/brand";
import { ScreenStrip } from "./screen-strip";
import { useHistory } from "./use-history";
import { useFittedSizes } from "./use-fit";
import type { AssetDto, ProjectDto, ScreenDto } from "./types";

type View = "single" | "grid";

export function Editor({
  project,
  initialAssets,
  initialScreens,
  initialBrand,
}: {
  project: ProjectDto;
  initialAssets: AssetDto[];
  initialScreens: ScreenDto[];
  initialBrand: Brand;
}) {
  const [brand, setBrand] = useState<Brand>(initialBrand);
  const [brandOpen, setBrandOpen] = useState(false);
  const [assets, setAssets] = useState(initialAssets);
  const [screens, setScreens] = useState(initialScreens);
  const locales = useMemo(
    () => [...new Set(screens.map((s) => s.locale))].sort(),
    [screens],
  );
  const [locale, setLocale] = useState(locales[0] ?? "en");
  const [device, setDevice] = useState<DeviceId>(
    (screens[0]?.device as DeviceId) ?? "iphone-6.9",
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [genOpen, setGenOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [view, setView] = useState<View>("single");
  const [zoom, setZoom] = useState<number | "fit">("fit");
  const [overlays, setOverlays] = useState<CanvasOverlays>({
    grid: false,
    safeArea: true,
    outlines: false,
  });

  const visible = useMemo(
    () =>
      screens
        .filter((s) => s.locale === locale && s.device === device)
        .sort((a, b) => a.position - b.position),
    [screens, locale, device],
  );
  const active = visible.find((s) => s.id === activeId) ?? visible[0] ?? null;

  // ---- persistence (debounced per screen) ----
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const persist = useCallback((id: string, scene: Scene) => {
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(() => {
      api(`/api/screens/${id}`, { method: "PATCH", json: { scene } }).catch(
        (e) => toast.error(`Save failed: ${e.message}`),
      );
    }, 400);
  }, []);

  const applyScene = useCallback(
    (id: string, scene: Scene) => {
      setScreens((prev) =>
        prev.map((s) => (s.id === id ? { ...s, scene } : s)),
      );
      persist(id, scene);
    },
    [persist],
  );
  const history = useHistory(applyScene);

  const updateScene = useCallback(
    (id: string, fn: (s: Scene) => Scene, opts?: { transient?: boolean }) => {
      setScreens((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const scene = fn(s.scene);
          if (!opts?.transient) history.push(id, s.scene, scene);
          persist(id, scene);
          return { ...s, scene };
        }),
      );
    },
    [persist, history],
  );

  /** Layer patch from drag: transient while dragging, committed on pointer up via commitDrag. */
  const updateLayer = useCallback(
    (layerId: string, patch: Partial<Layer>, transient = false) => {
      if (!active) return;
      updateScene(
        active.id,
        (s) => ({
          ...s,
          layers: s.layers.map((l) =>
            l.id === layerId ? ({ ...l, ...patch } as Layer) : l,
          ),
        }),
        { transient },
      );
    },
    [active, updateScene],
  );
  const dragStart = useRef<Scene | null>(null);
  const onDragStart = useCallback(() => {
    dragStart.current = active?.scene ?? null;
  }, [active]);
  const onDragEnd = useCallback(() => {
    if (active && dragStart.current && dragStart.current !== active.scene)
      history.push(active.id, dragStart.current, active.scene);
    dragStart.current = null;
  }, [active, history]);

  // ---- align selected layer ----
  function align(
    kind: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom",
  ) {
    if (!active || !selectedLayer) return;
    const l = active.scene.layers.find((x) => x.id === selectedLayer);
    if (!l) return;
    const W = active.scene.width;
    const H = active.scene.height;
    const pad = Math.round(W * 0.06);
    const patch: Partial<Layer> =
      kind === "left"
        ? { x: pad }
        : kind === "hcenter"
          ? { x: Math.round((W - l.w) / 2) }
          : kind === "right"
            ? { x: W - pad - l.w }
            : kind === "top"
              ? { y: pad }
              : kind === "vcenter"
                ? { y: Math.round((H - l.h) / 2) }
                : { y: H - pad - l.h };
    updateLayer(l.id, patch);
  }

  // ---- screen ops ----
  async function addScreen() {
    const [row] = await api<ScreenDto[]>(
      `/api/projects/${project.id}/screens`,
      {
        method: "POST",
        json: {
          locale,
          device,
          screens: [
            {
              template: "hero",
              title: "Headline",
              subtitle: "A short line about this feature.",
            },
          ],
        },
      },
    );
    setScreens((p) => [...p, row]);
    setActiveId(row.id);
  }
  async function duplicate() {
    if (!active) return;
    const row = await api<ScreenDto>(`/api/screens/${active.id}`, {
      method: "POST",
      json: {},
    });
    setScreens((p) => [...p, row]);
    setActiveId(row.id);
  }
  async function remove() {
    if (!active) return;
    await api(`/api/screens/${active.id}`, { method: "DELETE" });
    setScreens((p) => p.filter((s) => s.id !== active.id));
    setActiveId(null);
  }
  async function reorder(ids: string[]) {
    setScreens((p) =>
      p.map((s) =>
        ids.includes(s.id) ? { ...s, position: ids.indexOf(s.id) } : s,
      ),
    );
    await api(`/api/projects/${project.id}/screens`, {
      method: "PATCH",
      json: { ids },
    });
  }
  async function exportZip(all: boolean) {
    setExporting(true);
    const t = toast.loading(
      all ? "Rendering all screens" : `Rendering ${visible.length} screens`,
    );
    try {
      const q = all
        ? ""
        : `?locale=${encodeURIComponent(locale)}&device=${device}`;
      const res = await fetch(`/api/projects/${project.id}/export${q}`);
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${project.slug}-${all ? "all" : `${locale}-${device}`}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("ZIP downloaded", { id: t });
    } catch (e) {
      toast.error((e as Error).message, { id: t });
    } finally {
      setExporting(false);
    }
  }

  // ---- keyboard ----
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable
      )
        return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
        return;
      }
      if (mod && e.key === "0") {
        e.preventDefault();
        setZoom("fit");
        return;
      }
      if (mod && e.key === "1") {
        e.preventDefault();
        setZoom(1);
        return;
      }
      if (e.key === "g" && !mod) setOverlays((o) => ({ ...o, grid: !o.grid }));
      if (e.key === "Tab") {
        e.preventDefault();
        setView((v) => (v === "single" ? "grid" : "single"));
      }
      if (!active || !selectedLayer) return;
      const layer = active.scene.layers.find((l) => l.id === selectedLayer);
      if (!layer) return;
      if (e.key === "Backspace" || e.key === "Delete") {
        updateScene(active.id, (s) => ({
          ...s,
          layers: s.layers.filter((l) => l.id !== selectedLayer),
        }));
        setSelectedLayer(null);
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const copy = {
          ...layer,
          id: `${layer.type[0]}_${Math.random().toString(36).slice(2, 9)}`,
          x: layer.x + 40,
          y: layer.y + 40,
        };
        updateScene(active.id, (s) => ({ ...s, layers: [...s.layers, copy] }));
        setSelectedLayer(copy.id);
        return;
      }
      const step = e.shiftKey ? 20 : 2;
      if (e.key === "ArrowLeft") updateLayer(layer.id, { x: layer.x - step });
      if (e.key === "ArrowRight") updateLayer(layer.id, { x: layer.x + step });
      if (e.key === "ArrowUp") updateLayer(layer.id, { y: layer.y - step });
      if (e.key === "ArrowDown") updateLayer(layer.id, { y: layer.y + step });
      if (e.key === "Escape") setSelectedLayer(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, selectedLayer, updateLayer, updateScene, history]);

  const fitted = useFittedSizes(active?.scene ?? null);
  const hasSel = Boolean(active && selectedLayer);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects" aria-label="Back">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <span className="text-sm font-medium">{project.name}</span>
        <div className="mx-2 h-5 w-px bg-border" />
        <Select value={locale} onValueChange={setLocale}>
          <SelectTrigger className="h-8 w-20 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(locales.length ? locales : [locale]).map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <IconBtn
          label="Add locale"
          onClick={() => {
            const l = prompt("Locale code (e.g. en, tr, de):")
              ?.trim()
              .toLowerCase();
            if (l) setLocale(l);
          }}
        >
          <Plus className="size-4" />
        </IconBtn>
        <Select value={device} onValueChange={(v) => setDevice(v as DeviceId)}>
          <SelectTrigger className="h-8 w-48 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEVICE_IDS.map((id) => (
              <SelectItem key={id} value={id}>
                {DEVICES[id].label} · {DEVICES[id].width}×{DEVICES[id].height}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="mx-2 h-5 w-px bg-border" />
        <Seg>
          <SegBtn
            active={view === "single"}
            label="Single (Tab)"
            onClick={() => setView("single")}
          >
            <Square className="size-4" />
          </SegBtn>
          <SegBtn
            active={view === "grid"}
            label="All screens (Tab)"
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="size-4" />
          </SegBtn>
        </Seg>
        <Seg>
          <SegBtn
            active={overlays.grid}
            label="Grid (G)"
            onClick={() => setOverlays((o) => ({ ...o, grid: !o.grid }))}
          >
            <Grid3x3 className="size-4" />
          </SegBtn>
          <SegBtn
            active={overlays.safeArea}
            label="Safe area"
            onClick={() =>
              setOverlays((o) => ({ ...o, safeArea: !o.safeArea }))
            }
          >
            <Frame className="size-4" />
          </SegBtn>
          <SegBtn
            active={overlays.outlines}
            label="Layer outlines"
            onClick={() =>
              setOverlays((o) => ({ ...o, outlines: !o.outlines }))
            }
          >
            <BoxSelect className="size-4" />
          </SegBtn>
        </Seg>
        <Select
          value={zoom === "fit" ? "fit" : String(zoom)}
          onValueChange={(v) => setZoom(v === "fit" ? "fit" : Number(v))}
        >
          <SelectTrigger className="h-8 w-20 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fit">Fit</SelectItem>
            {[0.1, 0.15, 0.2, 0.25, 0.33, 0.5, 0.75, 1].map((z) => (
              <SelectItem key={z} value={String(z)}>
                {Math.round(z * 100)}%
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="mx-2 h-5 w-px bg-border" />
        <Seg>
          <SegBtn
            label="Undo (⌘Z)"
            onClick={history.undo}
            disabled={!history.canUndo}
          >
            <Undo2 className="size-4" />
          </SegBtn>
          <SegBtn
            label="Redo (⇧⌘Z)"
            onClick={history.redo}
            disabled={!history.canRedo}
          >
            <Redo2 className="size-4" />
          </SegBtn>
        </Seg>
        <Seg>
          <SegBtn
            label="Align left"
            onClick={() => align("left")}
            disabled={!hasSel}
          >
            <AlignStartVertical className="size-4" />
          </SegBtn>
          <SegBtn
            label="Center horizontally"
            onClick={() => align("hcenter")}
            disabled={!hasSel}
          >
            <AlignHorizontalJustifyCenter className="size-4" />
          </SegBtn>
          <SegBtn
            label="Align right"
            onClick={() => align("right")}
            disabled={!hasSel}
          >
            <AlignEndVertical className="size-4" />
          </SegBtn>
          <SegBtn
            label="Align top"
            onClick={() => align("top")}
            disabled={!hasSel}
          >
            <AlignStartHorizontal className="size-4" />
          </SegBtn>
          <SegBtn
            label="Center vertically"
            onClick={() => align("vcenter")}
            disabled={!hasSel}
          >
            <AlignVerticalJustifyCenter className="size-4" />
          </SegBtn>
          <SegBtn
            label="Align bottom"
            onClick={() => align("bottom")}
            disabled={!hasSel}
          >
            <AlignEndHorizontal className="size-4" />
          </SegBtn>
        </Seg>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant={brandOpen ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              setBrandOpen((o) => !o);
              setGenOpen(false);
            }}
          >
            <Palette className="size-4" /> Brand
          </Button>
          <Button
            variant={genOpen ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              setGenOpen((o) => !o);
              setBrandOpen(false);
            }}
          >
            <Sparkles className="size-4" /> Generate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportZip(false)}
            disabled={exporting || !visible.length}
          >
            <Download className="size-4" /> {locale}/{device}
          </Button>
          <Button
            size="sm"
            onClick={() => exportZip(true)}
            disabled={exporting || !screens.length}
          >
            <Download className="size-4" /> Export all
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <AssetsPanel
          project={project}
          assets={assets}
          onChange={setAssets}
          onUse={(asset) => {
            if (!active) return;
            const target = selectedLayer
              ? active.scene.layers.find((l) => l.id === selectedLayer)
              : undefined;
            if (target?.type === "mockup" || target?.type === "image")
              return updateLayer(target.id, { src: asset.url });
            const mock = active.scene.layers.find((l) => l.type === "mockup");
            if (mock && asset.kind === "screenshot")
              return updateLayer(mock.id, { src: asset.url });
            const s = Math.round(active.scene.width * 0.1);
            updateScene(active.id, (sc) => ({
              ...sc,
              layers: [
                ...sc.layers,
                {
                  id: `i_${Math.random().toString(36).slice(2, 9)}`,
                  type: "image",
                  src: asset.url,
                  fit: "contain",
                  radius: 0,
                  x: Math.round(sc.width * 0.07),
                  y: Math.round(sc.width * 0.07),
                  w: s,
                  h: s,
                  rotation: 0,
                  opacity: 1,
                  locked: false,
                },
              ],
            }));
          }}
        />

        <main className="flex min-w-0 flex-1 flex-col bg-[#141414]">
          {view === "grid" ? (
            <GridView
              screens={visible}
              activeId={active?.id ?? null}
              onOpen={(id) => {
                setActiveId(id);
                setSelectedLayer(null);
                setView("single");
              }}
              onReorder={reorder}
            />
          ) : active ? (
            <>
              <div className="min-h-0 flex-1">
                <Canvas
                  scene={active.scene}
                  selected={selectedLayer}
                  zoom={zoom}
                  overlays={overlays}
                  onSelect={setSelectedLayer}
                  onChange={(id, patch) => updateLayer(id, patch, true)}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onZoom={setZoom}
                  fitted={fitted}
                />
              </div>
              <ScreenStrip
                screens={visible}
                activeId={active.id}
                onSelect={(id) => {
                  setActiveId(id);
                  setSelectedLayer(null);
                }}
                onReorder={reorder}
                trailing={
                  <div className="flex items-center gap-1">
                    <IconBtn label="Add screen" onClick={addScreen}>
                      <Plus className="size-4" />
                    </IconBtn>
                    <IconBtn label="Duplicate" onClick={duplicate}>
                      <Copy className="size-4" />
                    </IconBtn>
                    <IconBtn label="Delete screen" onClick={remove}>
                      <Trash2 className="size-4" />
                    </IconBtn>
                  </div>
                }
              />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
              <div>
                <p>
                  No screens for {locale} / {DEVICES[device].label}.
                </p>
                <div className="mt-3 flex justify-center gap-2">
                  <Button size="sm" variant="outline" onClick={addScreen}>
                    <Plus className="size-4" /> Blank screen
                  </Button>
                  <Button size="sm" onClick={() => setGenOpen(true)}>
                    <Sparkles className="size-4" /> Generate
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>

        {brandOpen ? (
          <BrandPanel
            project={project}
            brand={brand}
            onChange={setBrand}
            onClose={() => setBrandOpen(false)}
          />
        ) : genOpen ? (
          <GeneratePanel
            project={project}
            brand={brand}
            assets={assets}
            locale={locale}
            device={device}
            onClose={() => setGenOpen(false)}
            onGenerated={(rows, l, d, replaced) => {
              setScreens((p) => [
                ...p.filter(
                  (s) =>
                    !(replaced && s.locale === l && s.device === d) &&
                    !rows.some((r) => r.id === s.id),
                ),
                ...rows,
              ]);
              setLocale(l);
              setDevice(d);
              setActiveId(rows[0]?.id ?? null);
              setView("grid");
            }}
          />
        ) : (
          <Inspector
            scene={active?.scene ?? null}
            selected={selectedLayer}
            onSelect={setSelectedLayer}
            onLayer={(id, patch) => updateLayer(id, patch)}
            onScene={(fn) => active && updateScene(active.id, fn)}
            assets={assets}
          />
        )}
      </div>
    </div>
  );
}

function Seg({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center rounded-md border border-border p-0.5">
      {children}
    </div>
  );
}

function SegBtn({
  active,
  label,
  onClick,
  disabled,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={active}
          className={`flex size-7 items-center justify-center rounded ${active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground"} disabled:opacity-30 disabled:hover:bg-transparent`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
