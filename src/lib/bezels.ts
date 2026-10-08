/**
 * Official Apple product bezels (developer.apple.com/design/resources).
 * PNGs live in public/bezels (gitignored, Apple license): run
 * `scripts/fetch-bezels.sh` on a fresh clone. The screen hole is measured
 * from each PNG's alpha channel and equals the App Store screenshot size.
 */
export type Bezel = {
  file: string;
  width: number;
  height: number;
  hole: { x: number; y: number; w: number; h: number };
};

export const BEZELS: Partial<Record<string, Bezel>> = {
  ipad: {
    file: "/bezels/ipad-13.png",
    width: 2300,
    height: 3000,
    hole: { x: 118, y: 124, w: 2064, h: 2752 },
  },
  "duo-outer": {
    file: "/bezels/duo-outer.png",
    width: 1574,
    height: 2194,
    hole: { x: 88, y: 80, w: 1398, h: 2034 },
  },
  "duo-inner": {
    file: "/bezels/duo-inner.png",
    width: 2247,
    height: 3093,
    hole: { x: 120, y: 120, w: 2007, h: 2853 },
  },
};

export function bezelFor(frame: string): Bezel | undefined {
  return BEZELS[frame];
}
