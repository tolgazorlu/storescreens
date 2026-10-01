"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Download,
  Plus,
  Trash2,
  Copy,
  Sparkles,
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
import { Canvas } from "./canvas";
import { Inspector } from "./inspector";
import { AssetsPanel } from "./assets-panel";
import { GenerateDialog } from "./generate-dialog";
import { ScreenStrip } from "./screen-strip";
import type { AssetDto, ProjectDto, ScreenDto } from "./types";

export function Editor({
  project,
  initialAssets,
  initialScreens,
}: {
  project: ProjectDto;
  initialAssets: AssetDto[];
  initialScreens: ScreenDto[];
}) {
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
    }, 500);
  }, []);

  const updateScene = useCallback(
    (id: string, fn: (s: Scene) => Scene) => {
      setScreens((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const scene = fn(s.scene);
          persist(id, scene);
          return { ...s, scene };
        }),
      );
    },
    [persist],
  );

  const updateLayer = useCallback(
    (layerId: string, patch: Partial<Layer>) => {
      if (!active) return;
      updateScene(active.id, (s) => ({
        ...s,
        layers: s.layers.map((l) =>
          l.id === layerId ? ({ ...l, ...patch } as Layer) : l,
        ),
      }));
    },
    [active, updateScene],
  );

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
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  // keyboard: delete layer, nudge
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!active || !selectedLayer) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const layer = active.scene.layers.find((l) => l.id === selectedLayer);
      if (!layer) return;
      if (e.key === "Backspace" || e.key === "Delete") {
        updateScene(active.id, (s) => ({
          ...s,
          layers: s.layers.filter((l) => l.id !== selectedLayer),
        }));
        setSelectedLayer(null);
      }
      const step = e.shiftKey ? 20 : 2;
      if (e.key === "ArrowLeft") updateLayer(layer.id, { x: layer.x - step });
      if (e.key === "ArrowRight") updateLayer(layer.id, { x: layer.x + step });
      if (e.key === "ArrowUp") updateLayer(layer.id, { y: layer.y - step });
      if (e.key === "ArrowDown") updateLayer(layer.id, { y: layer.y + step });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, selectedLayer, updateLayer, updateScene]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects" aria-label="Back">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <span className="text-sm font-medium">{project.name}</span>
        <div className="mx-3 h-5 w-px bg-border" />
        <Select value={locale} onValueChange={setLocale}>
          <SelectTrigger className="h-8 w-24 text-xs">
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
        <NewLocale onAdd={(l) => setLocale(l)} />
        <Select value={device} onValueChange={(v) => setDevice(v as DeviceId)}>
          <SelectTrigger className="h-8 w-44 text-xs">
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
        <div className="ml-auto flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setGenOpen(true)}>
            <Sparkles className="size-4" /> Generate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportZip(false)}
            disabled={exporting || !visible.length}
          >
            <Download className="size-4" /> Export {locale}/{device}
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
            if (target?.type === "mockup")
              return updateLayer(target.id, { src: asset.url });
            if (target?.type === "image")
              return updateLayer(target.id, { src: asset.url });
            const mock = active.scene.layers.find((l) => l.type === "mockup");
            if (mock && asset.kind === "screenshot")
              return updateLayer(mock.id, { src: asset.url });
            // otherwise add as image layer
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

        <main className="flex min-w-0 flex-1 flex-col bg-[#161616]">
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-6">
            {active ? (
              <Canvas
                scene={active.scene}
                selected={selectedLayer}
                onSelect={setSelectedLayer}
                onChange={updateLayer}
              />
            ) : (
              <div className="text-center text-sm text-muted-foreground">
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
            )}
          </div>
          <ScreenStrip
            screens={visible}
            activeId={active?.id ?? null}
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
                <IconBtn
                  label="Duplicate"
                  onClick={duplicate}
                  disabled={!active}
                >
                  <Copy className="size-4" />
                </IconBtn>
                <IconBtn
                  label="Delete screen"
                  onClick={remove}
                  disabled={!active}
                >
                  <Trash2 className="size-4" />
                </IconBtn>
              </div>
            }
          />
        </main>

        <Inspector
          scene={active?.scene ?? null}
          selected={selectedLayer}
          onSelect={setSelectedLayer}
          onLayer={updateLayer}
          onScene={(fn) => active && updateScene(active.id, fn)}
          assets={assets}
        />
      </div>

      <GenerateDialog
        open={genOpen}
        onOpenChange={setGenOpen}
        project={project}
        assets={assets}
        locale={locale}
        device={device}
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
        }}
      />
    </div>
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

function NewLocale({ onAdd }: { onAdd: (l: string) => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Add locale"
          onClick={() => {
            const l = prompt("Locale code (e.g. en, tr, de):")
              ?.trim()
              .toLowerCase();
            if (l) onAdd(l);
          }}
        >
          <Plus className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Add locale</TooltipContent>
    </Tooltip>
  );
}
