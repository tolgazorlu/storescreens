import type { Background, Glow, Texture } from "./scene";
import { patternSrc } from "./patterns";

/**
 * One background renderer used by both the exporter (satori/resvg) and the editor canvas (DOM):
 * every background type, plus texture overlay and glow blobs, is baked into a single SVG and
 * drawn as an `<img>` so the two renderers never disagree. Mesh/glow use layered radial
 * gradients with opacity stops, never `feGaussianBlur` (resvg panics on a big blur).
 */

/** Deterministic PRNG so a mesh `seed` always draws the same blobs (mulberry32). */
function rng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  return `#${m[1]}${Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, "0")}`;
}

/** Radial blob: solid at the center fading to transparent, no blur. */
function blobDefs(id: string, color: string, opacity: number): string {
  return (
    `<radialGradient id="${id}" cx="50%" cy="50%" r="50%">` +
    `<stop offset="0%" stop-color="${hexAlpha(color, opacity)}"/>` +
    `<stop offset="100%" stop-color="${hexAlpha(color, 0)}"/>` +
    `</radialGradient>`
  );
}

function blobRect(id: string, w: number, h: number, cx: number, cy: number, size: number): string {
  const r = size / 2;
  return `<rect x="${cx - r}" y="${cy - r}" width="${size}" height="${size}" fill="url(#${id})"/>`;
}

function glowLayer(g: Glow, w: number, h: number, i: number): { defs: string; rect: string } {
  const id = `glow${i}`;
  const size = Math.max(w, h) * g.size;
  return {
    defs: blobDefs(id, g.color, g.opacity),
    rect: blobRect(id, w, h, g.x * w, g.y * h, size),
  };
}

/** Texture overlay, tiled (grain/dots/grid/stripes/waves/halftone) or centered (concentric). */
function textureLayer(t: Texture, w: number, h: number): string {
  if (t.type === "none" || t.opacity <= 0) return "";
  const c = t.color;
  const tile = Math.round(Math.max(w, h) * 0.018);
  const stroke = Math.max(1, Math.round(tile * 0.08));
  let patternBody = "";
  switch (t.type) {
    case "grain": {
      const rnd = rng(7);
      let dots = "";
      for (let i = 0; i < 10; i++) {
        dots += `<circle cx="${(rnd() * tile).toFixed(1)}" cy="${(rnd() * tile).toFixed(1)}" r="${(tile * 0.03 + rnd() * tile * 0.03).toFixed(1)}" fill="${c}" fill-opacity="${(0.4 + rnd() * 0.6).toFixed(2)}"/>`;
      }
      patternBody = dots;
      break;
    }
    case "dots":
      patternBody = `<circle cx="${tile / 2}" cy="${tile / 2}" r="${tile * 0.09}" fill="${c}"/>`;
      break;
    case "halftone":
      patternBody = `<circle cx="${tile / 2}" cy="${tile / 2}" r="${tile * 0.22}" fill="${c}"/>`;
      break;
    case "grid":
      patternBody = `<path d="M0 0H${tile}M0 0V${tile}" stroke="${c}" stroke-width="${stroke}" fill="none"/>`;
      break;
    case "stripes":
      patternBody = `<path d="M0 ${tile}L${tile} 0" stroke="${c}" stroke-width="${stroke}" fill="none"/>`;
      break;
    case "waves":
      patternBody = `<path d="M0 ${tile / 2} Q ${tile / 4} 0 ${tile / 2} ${tile / 2} T ${tile} ${tile / 2}" stroke="${c}" stroke-width="${stroke}" fill="none"/>`;
      break;
    case "concentric": {
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.max(w, h) * 0.75;
      const step = Math.max(w, h) * 0.04;
      let rings = "";
      for (let r = step; r < maxR; r += step) {
        rings += `<circle cx="${cx}" cy="${cy}" r="${r}" stroke="${c}" stroke-width="${stroke}" fill="none"/>`;
      }
      return `<g opacity="${t.opacity}">${rings}</g>`;
    }
  }
  const pid = "tex";
  return (
    `<defs><pattern id="${pid}" width="${tile}" height="${tile}" patternUnits="userSpaceOnUse">${patternBody}</pattern></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#${pid})" opacity="${t.opacity}"/>`
  );
}

/** Build the full background (base fill + glow blobs + texture) as one flat SVG data URL. */
export function backgroundSvgDataUrl(
  bg: Background,
  w: number,
  h: number,
  resolveSrc: (src: string) => string = (s) => s,
): string {
  let defs = "";
  let body = "";
  switch (bg.type) {
    case "solid":
      body += `<rect width="${w}" height="${h}" fill="${bg.color}"/>`;
      break;
    case "gradient": {
      const stops = bg.via
        ? `<stop offset="0" stop-color="${bg.from}"/><stop offset="0.5" stop-color="${bg.via}"/><stop offset="1" stop-color="${bg.to}"/>`
        : `<stop offset="0" stop-color="${bg.from}"/><stop offset="1" stop-color="${bg.to}"/>`;
      const a = (bg.angle * Math.PI) / 180;
      const dx = Math.sin(a);
      const dy = -Math.cos(a);
      const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
      const [x1, y1, x2, y2] = [w / 2 - dx * half, h / 2 - dy * half, w / 2 + dx * half, h / 2 + dy * half].map((n) => Math.round(n));
      defs += `<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient>`;
      body += `<rect width="${w}" height="${h}" fill="url(#g)"/>`;
      break;
    }
    case "radial":
      defs += `<radialGradient id="g" cx="${bg.cx * 100}%" cy="${bg.cy * 100}%" r="75%"><stop offset="0" stop-color="${bg.from}"/><stop offset="1" stop-color="${bg.to}"/></radialGradient>`;
      body += `<rect width="${w}" height="${h}" fill="url(#g)"/>`;
      break;
    case "split": {
      const a = ((bg.angle % 360) * Math.PI) / 180;
      const diag = Math.hypot(w, h) * 1.5;
      const nx = Math.cos(a);
      const ny = Math.sin(a);
      const cx = w * bg.split;
      const cy = h * bg.split;
      const px = -ny;
      const py = nx;
      const pt = (t: number) => [cx + px * t, cy + py * t] as const;
      const [ax, ay] = pt(diag);
      const [bx, by] = pt(-diag);
      body += `<rect width="${w}" height="${h}" fill="${bg.colorB}"/>`;
      body += `<polygon points="${ax},${ay} ${bx},${by} ${bx - nx * diag * 2},${by - ny * diag * 2} ${ax - nx * diag * 2},${ay - ny * diag * 2}" fill="${bg.colorA}"/>`;
      break;
    }
    case "mesh": {
      body += `<rect width="${w}" height="${h}" fill="${bg.base}"/>`;
      const rnd = rng(bg.seed);
      bg.colors.forEach((color, i) => {
        const id = `mesh${i}`;
        const cx = w * (0.1 + rnd() * 0.8);
        const cy = h * (0.1 + rnd() * 0.8);
        const size = Math.max(w, h) * (0.55 + rnd() * 0.55);
        defs += blobDefs(id, color, 0.9);
        body += blobRect(id, w, h, cx, cy, size);
      });
      break;
    }
    case "image":
      body += `<image href="${resolveSrc(bg.src)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`;
      if (bg.dim > 0) body += `<rect width="${w}" height="${h}" fill="#000000" opacity="${bg.dim}"/>`;
      break;
    case "pattern":
      body += `<image href="${resolveSrc(patternSrc(bg.id))}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`;
      break;
  }
  (bg.glow ?? []).forEach((g, i) => {
    const { defs: d, rect } = glowLayer(g, w, h, i);
    defs += d;
    body += rect;
  });
  if (bg.texture) body += textureLayer(bg.texture, w, h);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`;
  // btoa, not Buffer: this module runs in the browser (editor canvas) too.
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
