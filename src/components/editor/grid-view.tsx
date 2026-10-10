"use client";
import { useState } from "react";
import { SceneView } from "@/components/scene/scene-view";
import type { ScreenDto } from "./types";

/** All screens of the current locale/device as tiles; click opens, drag reorders. */
export function GridView({
  screens,
  activeId,
  onOpen,
  onReorder,
}: {
  screens: ScreenDto[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onReorder: (ids: string[]) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  function drop(targetId: string) {
    setOver(null);
    if (!dragId || dragId === targetId) return;
    const ids = screens.map((s) => s.id);
    ids.splice(ids.indexOf(targetId), 0, ...ids.splice(ids.indexOf(dragId), 1));
    onReorder(ids);
    setDragId(null);
  }

  if (!screens.length)
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        No screens in this set yet.
      </div>
    );

  return (
    <div className="flex-1 overflow-auto p-6">
      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: "repeat(auto-fill, 220px)" }}
      >
        {screens.map((s, i) => {
          const w = 220;
          const k = w / s.scene.width;
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
              onClick={() => onOpen(s.id)}
              className={`group relative overflow-hidden rounded-md text-left transition ${s.id === activeId ? "ring-2 ring-foreground" : "ring-1 ring-border hover:ring-muted-foreground"} ${over === s.id && dragId !== s.id ? "ring-2 ring-foreground/60 ring-offset-2 ring-offset-background" : ""} ${dragId === s.id ? "opacity-40" : ""}`}
              style={{ aspectRatio: `${s.scene.width} / ${s.scene.height}` }}
            >
              <div
                style={{
                  width: s.scene.width,
                  height: s.scene.height,
                  transform: `scale(${k})`,
                  transformOrigin: "top left",
                  pointerEvents: "none",
                }}
                className="origin-top-left"
              >
                <SceneView scene={s.scene} />
              </div>
              <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[11px] text-white">
                {String(i + 1).padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
