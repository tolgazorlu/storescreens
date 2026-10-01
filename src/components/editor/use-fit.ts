"use client";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { createElement } from "react";
import type { Scene, TextLayer } from "@/lib/scene";
import { fitScene } from "@/lib/fit";
import { TextContent } from "@/components/scene/scene-view";

let host: HTMLDivElement | null = null;
function probeHost() {
  if (!host) {
    host = document.createElement("div");
    host.style.cssText =
      "position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none";
    document.body.appendChild(host);
  }
  return host;
}

/** DOM twin of render.ts#measureWithSatori: same TextContent, same probes. */
async function measureWithDom(layer: TextLayer, fontSize: number) {
  await document.fonts.ready;
  const el = document.createElement("div");
  el.style.cssText = `display:flex;width:${layer.w}px;align-items:flex-start`;
  probeHost().appendChild(el);
  const root = createRoot(el);
  flushSync(() =>
    root.render(
      createElement(
        "div",
        { style: { display: "flex", width: layer.w } },
        createElement(TextContent, { layer, fontSize }),
      ),
    ),
  );
  const height = (el.firstElementChild as HTMLElement).getBoundingClientRect()
    .height;
  const longest = layer.text
    .split(/\s+/)
    .reduce((a, b) => (b.length > a.length ? b : a), "");
  flushSync(() =>
    root.render(
      createElement(
        "div",
        { style: { display: "flex", width: "auto" } },
        createElement(TextContent, {
          layer: { ...layer, text: longest, align: "left" },
          fontSize,
          block: false,
        }),
      ),
    ),
  );
  const width = (el.firstElementChild as HTMLElement).getBoundingClientRect()
    .width;
  root.unmount();
  el.remove();
  return { width, height };
}

/**
 * Fitted font sizes for every text layer of a scene, recomputed when the
 * scene changes. Returns {} until the first measurement resolves.
 */
export function useFittedSizes(scene: Scene | null) {
  const [fitted, setFitted] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!scene) return;
    let alive = true;
    const t = setTimeout(() => {
      fitScene(scene, measureWithDom).then((r) => alive && setFitted(r.fitted));
    }, 60);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [scene]);
  return fitted;
}
