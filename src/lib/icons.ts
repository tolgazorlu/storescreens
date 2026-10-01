/**
 * Small built-in icon set (lucide outlines, 24x24 stroke paths). Rendered as
 * an <img> with an SVG data URI so satori and the browser draw it the same.
 */
export const ICONS: Record<string, string> = {
  check: "M20 6 9 17l-5-5",
  zap: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",
  star: "M11.5 2.5a.6.6 0 0 1 1 0l2.6 5.6 6.1.7a.6.6 0 0 1 .3 1l-4.5 4.2 1.2 6a.6.6 0 0 1-.9.7L12 17.8l-5.3 2.9a.6.6 0 0 1-.9-.7l1.2-6-4.5-4.2a.6.6 0 0 1 .3-1l6.1-.7z",
  shield:
    "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
  clock: "M12 6v6l4 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z",
  camera:
    "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  tag: "M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z M7.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z",
  chart: "M3 3v16a2 2 0 0 0 2 2h16 M18 17V9 M13 17V5 M8 17v-3",
  qr: "M3 3h5v5H3z M16 3h5v5h-5z M3 16h5v5H3z M21 16h-3a2 2 0 0 0-2 2v3 M21 21v.01 M12 7v3a2 2 0 0 1-2 2H7 M3 12h.01 M12 3h.01 M12 16v.01 M16 12h1 M21 12v.01 M12 21v-1",
  cloud: "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z",
  globe:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20 M2 12h20",
  bell: "M10.3 21a1.94 1.94 0 0 0 3.4 0 M4 2C2.8 3.7 2 5.7 2 8 M22 8c0-2.3-.8-4.3-2-6 M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9",
  lock: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4",
  heart:
    "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",
  sparkles:
    "M9.9 2.1 11.7 7.3 16.9 9 11.7 10.7 9.9 15.9 8.1 10.7 2.9 9 8.1 7.3z M20 3v4 M22 5h-4 M4 17v2 M5 18H3",
};

export const ICON_IDS = Object.keys(ICONS);

export function iconDataUri(id: string, color: string, strokeWidth = 2) {
  const d = ICONS[id] ?? ICONS.check;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
