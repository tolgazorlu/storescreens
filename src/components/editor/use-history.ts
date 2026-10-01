"use client";
import { useCallback, useMemo, useState } from "react";
import type { Scene } from "@/lib/scene";

type Entry = { id: string; before: Scene; after: Scene };
type Stacks = { past: Entry[]; future: Entry[] };

/** Undo/redo stack over whole scenes (scenes are small JSON; snapshots are cheap). */
export function useHistory(
  apply: (id: string, scene: Scene) => void,
  limit = 100,
) {
  const [stacks, setStacks] = useState<Stacks>({ past: [], future: [] });

  const push = useCallback(
    (id: string, before: Scene, after: Scene) => {
      if (before === after) return;
      setStacks((s) => ({
        past: [...s.past.slice(-(limit - 1)), { id, before, after }],
        future: [],
      }));
    },
    [limit],
  );
  const undo = useCallback(() => {
    setStacks((s) => {
      const e = s.past[s.past.length - 1];
      if (!e) return s;
      queueMicrotask(() => apply(e.id, e.before));
      return { past: s.past.slice(0, -1), future: [...s.future, e] };
    });
  }, [apply]);
  const redo = useCallback(() => {
    setStacks((s) => {
      const e = s.future[s.future.length - 1];
      if (!e) return s;
      queueMicrotask(() => apply(e.id, e.after));
      return { past: [...s.past, e], future: s.future.slice(0, -1) };
    });
  }, [apply]);

  return useMemo(
    () => ({
      push,
      undo,
      redo,
      canUndo: stacks.past.length > 0,
      canRedo: stacks.future.length > 0,
    }),
    [push, undo, redo, stacks],
  );
}
