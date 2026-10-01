"use client";
import { useState } from "react";
import { SceneView } from "@/components/scene/scene-view";
import type { ScreenDto } from "./types";

/** Horizontal strip of screens for the current locale+device; drag to reorder. */
export function ScreenStrip({
  screens,
  activeId,
  onSelect,
  onReorder,
  trailing,
}: {
  screens: ScreenDto[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onReorder: (ids: string[]) => void;
  trailing?: React.ReactNode;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const H = 120;

  function drop(targetId: string) {
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
    <div className="flex h-40 shrink-0 items-center gap-3 overflow-x-auto border-t border-border px-4">
      {screens.map((s, i) => {
        const k = H / s.scene.height;
        return (
          <button
            key={s.id}
            draggable
            onDragStart={() => setDragId(s.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => drop(s.id)}
            onClick={() => onSelect(s.id)}
            className={`relative shrink-0 overflow-hidden rounded-sm ${s.id === activeId ? "ring-2 ring-foreground" : "ring-1 ring-border"}`}
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
            <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">
              {i + 1}
            </span>
          </button>
        );
      })}
      {trailing}
    </div>
  );
}
