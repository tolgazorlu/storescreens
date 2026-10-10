"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { SceneView } from "@/components/scene/scene-view";
import type { ScreenDto } from "./types";

const H = 112;

/** Horizontal strip of screens for the current locale+device; drag to reorder. */
export function ScreenStrip({
  screens,
  activeId,
  onSelect,
  onReorder,
  onAdd,
  actions,
}: {
  screens: ScreenDto[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onReorder: (ids: string[]) => void;
  onAdd: () => void;
  actions?: React.ReactNode;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const index = screens.findIndex((s) => s.id === activeId);

  function drop(targetId: string) {
    setOver(null);
    if (!dragId || dragId === targetId) return;
    const ids = screens.map((s) => s.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    onReorder(ids);
    setDragId(null);
  }

  return (
    <div className="flex h-40 shrink-0 border-t border-border">
      <div className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto px-4">
        {screens.map((s, i) => {
          const k = H / s.scene.height;
          const isActive = s.id === activeId;
          return (
            <button
              key={s.id}
              draggable
              onDragStart={() => setDragId(s.id)}
              onDragEnd={() => {
                setDragId(null);
                setOver(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(s.id);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={() => drop(s.id)}
              onClick={() => onSelect(s.id)}
              aria-label={`Screen ${i + 1}`}
              aria-current={isActive}
              className={`relative shrink-0 overflow-hidden rounded-md transition focus-visible:outline-none ${
                isActive
                  ? "ring-2 ring-foreground"
                  : "opacity-80 ring-1 ring-border hover:opacity-100 hover:ring-muted-foreground"
              } ${over === s.id && dragId !== s.id ? "ring-2 ring-foreground/60 ring-offset-2 ring-offset-background" : ""} ${dragId === s.id ? "opacity-40" : ""}`}
              style={{ width: s.scene.width * k, height: H }}
            >
              <div
                style={{
                  width: s.scene.width,
                  height: s.scene.height,
                  transform: `scale(${k})`,
                  transformOrigin: "top left",
                  pointerEvents: "none",
                }}
              >
                <SceneView scene={s.scene} />
              </div>
              <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 font-mono text-[10px] text-white tabular-nums">
                {i + 1}
              </span>
            </button>
          );
        })}
        <button
          onClick={onAdd}
          aria-label="Add screen"
          title="Add screen"
          className="flex shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground"
          style={{
            width: screens[0]
              ? Math.max(
                  48,
                  (screens[0].scene.width * H) / screens[0].scene.height,
                )
              : 52,
            height: H,
          }}
        >
          <Plus className="size-5" />
        </button>
      </div>
      {actions && index >= 0 && (
        <div className="flex shrink-0 flex-col items-center justify-center gap-1 border-l border-border px-3">
          <span className="mb-1 font-mono text-[11px] text-muted-foreground tabular-nums">
            {index + 1}/{screens.length}
          </span>
          {actions}
        </div>
      )}
    </div>
  );
}
